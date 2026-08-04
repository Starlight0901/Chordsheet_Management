import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Library, Plus, Search } from 'lucide-react'
import { HymnFilterPanel } from '../components/filters/HymnFilterPanel'
import { HymnCard } from '../components/hymns/HymnCard'
import { EmptyState, ErrorState, PageHeader } from '../components/ui/EmptyState'
import { HymnCardSkeleton } from '../components/ui/Skeleton'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getChordSheetCountsByHymn } from '../services/chordSheetService'
import { addFavorite, listFavorites, removeFavorite } from '../services/favoriteService'
import { listHymns } from '../services/hymnService'
import { listAllUserHymnTags, listUserTags } from '../services/tagService'
import type { Hymn, UserTag } from '../types'
import {
  buildHymnTagMap,
  createEmptyHymnFilter,
  filterHymns,
  hasActiveHymnFilters,
  toHymnFilterOptions,
  type HymnFilterState,
} from '../utils/hymnFilters'

type LoadState = 'loading' | 'ready' | 'error'

async function settledValue<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch {
    return fallback
  }
}

export function HymnsPage() {
  const { currentUser } = useAuth()
  const toast = useToast()

  const [hymns, setHymns] = useState<Hymn[]>([])
  const [chordSheetCounts, setChordSheetCounts] = useState<Record<string, number>>({})
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null)
  const [userTags, setUserTags] = useState<UserTag[]>([])
  const [hymnTagMap, setHymnTagMap] = useState<Map<string, Set<string>>>(new Map())

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState<HymnFilterState>(createEmptyHymnFilter)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoadState('loading')
      setErrorMessage(null)

      try {
        // Primary: shared library must not depend on personal data succeeding.
        const hymnList = await listHymns()
        if (cancelled) return
        setHymns(hymnList)
        setLoadState('ready')

        const userId = currentUser?.uid
        const [counts, favorites, tags, hymnTags] = await Promise.all([
          settledValue(getChordSheetCountsByHymn(), {}),
          userId ? settledValue(listFavorites(userId), []) : Promise.resolve([]),
          userId ? settledValue(listUserTags(userId), []) : Promise.resolve([]),
          userId ? settledValue(listAllUserHymnTags(userId), []) : Promise.resolve([]),
        ])

        if (cancelled) return

        setChordSheetCounts(counts)
        setFavoriteIds(new Set(favorites.map((favorite) => favorite.hymnId)))
        setUserTags(tags)
        setHymnTagMap(buildHymnTagMap(hymnTags))
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load hymns.')
        setLoadState('error')
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [currentUser?.uid])

  const filteredHymns = useMemo(
    () => filterHymns(hymns, toHymnFilterOptions(filter, hymnTagMap)),
    [hymns, filter, hymnTagMap],
  )

  const hasActiveFilters = hasActiveHymnFilters(filter)

  async function handleToggleFavorite(hymnId: string, next: boolean) {
    if (!currentUser) return

    setFavoriteBusyId(hymnId)
    const previous = new Set(favoriteIds)
    const optimistic = new Set(favoriteIds)
    if (next) optimistic.add(hymnId)
    else optimistic.delete(hymnId)
    setFavoriteIds(optimistic)

    try {
      if (next) {
        await addFavorite(currentUser.uid, hymnId)
        toast.success('Added to favorites')
      } else {
        await removeFavorite(currentUser.uid, hymnId)
        toast.info('Removed from favorites')
      }
    } catch {
      setFavoriteIds(previous)
      toast.error('Could not update favorite')
    } finally {
      setFavoriteBusyId(null)
    }
  }

  async function handleRetry() {
    setLoadState('loading')
    setErrorMessage(null)

    try {
      const hymnList = await listHymns()
      setHymns(hymnList)
      setLoadState('ready')

      const userId = currentUser?.uid
      const [counts, favorites, tags, hymnTags] = await Promise.all([
        settledValue(getChordSheetCountsByHymn(), {}),
        userId ? settledValue(listFavorites(userId), []) : Promise.resolve([]),
        userId ? settledValue(listUserTags(userId), []) : Promise.resolve([]),
        userId ? settledValue(listAllUserHymnTags(userId), []) : Promise.resolve([]),
      ])

      setChordSheetCounts(counts)
      setFavoriteIds(new Set(favorites.map((favorite) => favorite.hymnId)))
      setUserTags(tags)
      setHymnTagMap(buildHymnTagMap(hymnTags))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load hymns.')
      setLoadState('error')
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        compact
        title="Hymn library"
        actions={
          <Link
            to="/hymns/new"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gold-500 px-3 text-sm font-medium text-white transition hover:bg-gold-400 sm:gap-2 sm:px-4"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add Hymn</span>
          </Link>
        }
      />

      <div className="mb-4">
        <HymnFilterPanel
          compact
          value={filter}
          onChange={setFilter}
          userTags={userTags}
          showUserTags={Boolean(currentUser)}
          searchPlaceholder="Search hymns…"
        />
      </div>

      {loadState === 'loading' && (
        <div className="grid gap-3 lg:grid-cols-2" aria-busy="true" aria-label="Loading hymns">
          {Array.from({ length: 4 }).map((_, index) => (
            <HymnCardSkeleton key={index} />
          ))}
        </div>
      )}

      {loadState === 'error' && (
        <ErrorState
          title="Couldn’t load the hymn library"
          description={errorMessage ?? undefined}
          action={
            <button
              type="button"
              onClick={() => void handleRetry()}
              className="rounded-xl border border-ink-600 bg-ink-800/60 px-4 py-2 text-sm text-ink-200 transition hover:border-gold-500/40 hover:text-gold-500"
            >
              Try again
            </button>
          }
        />
      )}

      {loadState === 'ready' && hymns.length === 0 && (
        <EmptyState
          icon={Library}
          title="No hymns yet"
          description="Add the first shared hymn to start building the library."
          action={
            <Link
              to="/hymns/new"
              className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gold-400"
            >
              <Plus className="h-4 w-4" />
              Add Hymn
            </Link>
          }
        />
      )}

      {loadState === 'ready' && hymns.length > 0 && filteredHymns.length === 0 && (
        <EmptyState
          icon={Search}
          title="No matching hymns"
          description={
            hasActiveFilters ? 'Try adjusting the search or filters.' : 'Nothing to show right now.'
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={() => setFilter(createEmptyHymnFilter())}
                className="text-sm text-gold-500 transition hover:text-gold-400"
              >
                Clear search & filters
              </button>
            ) : undefined
          }
        />
      )}

      {loadState === 'ready' && filteredHymns.length > 0 && (
        <div>
          <p className="mb-3 text-xs text-ink-500">
            Showing {filteredHymns.length} of {hymns.length}{' '}
            {hymns.length === 1 ? 'hymn' : 'hymns'}
          </p>
          <ul className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
            {filteredHymns.map((hymn) => (
              <li key={hymn.id}>
                <HymnCard
                  hymn={hymn}
                  chordSheetCount={chordSheetCounts[hymn.id] ?? 0}
                  isFavorite={favoriteIds.has(hymn.id)}
                  favoriteBusy={favoriteBusyId === hymn.id}
                  onToggleFavorite={handleToggleFavorite}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
