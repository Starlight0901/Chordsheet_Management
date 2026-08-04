import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Pencil, Search } from 'lucide-react'
import { HymnCard } from '../components/hymns/HymnCard'
import { useAuth } from '../context/AuthContext'
import { getChordSheetCountsByHymn } from '../services/chordSheetService'
import { addFavorite, listFavorites, removeFavorite } from '../services/favoriteService'
import { listHymns } from '../services/hymnService'
import { getUserList } from '../services/listService'
import { listAllUserHymnTags, listUserTags } from '../services/tagService'
import type { Hymn, UserList, UserTag } from '../types'
import {
  buildHymnTagMap,
  describeSmartListFilter,
  evaluateSmartList,
  matchesHymnName,
  sanitizeSmartListFilter,
} from '../utils/hymnFilters'

type LoadState = 'loading' | 'ready' | 'error' | 'missing' | 'forbidden'

export function SmartListDetailPage() {
  const { listId } = useParams<{ listId: string }>()
  const { currentUser } = useAuth()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [list, setList] = useState<UserList | null>(null)
  const [hymns, setHymns] = useState<Hymn[]>([])
  const [tags, setTags] = useState<UserTag[]>([])
  const [hymnTagMap, setHymnTagMap] = useState<Map<string, Set<string>>>(new Map())
  const [chordSheetCounts, setChordSheetCounts] = useState<Record<string, number>>({})
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!listId || !currentUser) {
      setLoadState(!currentUser ? 'forbidden' : 'missing')
      return
    }

    let cancelled = false

    async function load() {
      setLoadState('loading')
      setErrorMessage(null)

      try {
        const userId = currentUser!.uid
        const [listDoc, allHymns] = await Promise.all([getUserList(listId!), listHymns()])

        if (cancelled) return

        if (!listDoc || listDoc.type !== 'smart') {
          setLoadState('missing')
          return
        }
        if (listDoc.userId !== userId) {
          setLoadState('forbidden')
          return
        }

        setList(listDoc)
        setHymns(allHymns)
        setLoadState('ready')

        const [counts, favorites, userTags, links] = await Promise.all([
          getChordSheetCountsByHymn().catch(() => ({})),
          listFavorites(userId).catch(() => []),
          listUserTags(userId).catch(() => []),
          listAllUserHymnTags(userId).catch(() => []),
        ])

        if (cancelled) return

        setChordSheetCounts(counts)
        setFavoriteIds(new Set(favorites.map((favorite) => favorite.hymnId)))
        setTags(userTags)
        setHymnTagMap(buildHymnTagMap(links))
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load smart list.')
        setLoadState('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [listId, currentUser])

  const filter = useMemo(() => sanitizeSmartListFilter(list?.filter), [list])

  const matchedHymns = useMemo(
    () => evaluateSmartList(hymns, filter, hymnTagMap),
    [hymns, filter, hymnTagMap],
  )

  const displayed = useMemo(
    () => matchedHymns.filter((hymn) => matchesHymnName(hymn.name, searchQuery)),
    [matchedHymns, searchQuery],
  )

  async function handleToggleFavorite(hymnId: string, next: boolean) {
    if (!currentUser) return
    setFavoriteBusyId(hymnId)
    const previous = new Set(favoriteIds)
    const optimistic = new Set(favoriteIds)
    if (next) optimistic.add(hymnId)
    else optimistic.delete(hymnId)
    setFavoriteIds(optimistic)
    try {
      if (next) await addFavorite(currentUser.uid, hymnId)
      else await removeFavorite(currentUser.uid, hymnId)
    } catch {
      setFavoriteIds(previous)
    } finally {
      setFavoriteBusyId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link
        to="/smart-lists"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 transition hover:text-gold-400"
      >
        <ArrowLeft className="h-4 w-4" />
        All smart lists
      </Link>

      {loadState === 'loading' && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-700/70 bg-ink-800/30 px-6 py-20">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-gold-400" />
          <p className="text-sm text-ink-400">Evaluating smart list…</p>
        </div>
      )}

      {loadState === 'error' && (
        <div className="rounded-2xl border border-ember-500/40 bg-ember-500/10 px-6 py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-ember-500" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink-100">Couldn’t open smart list</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">{errorMessage}</p>
        </div>
      )}

      {(loadState === 'missing' || loadState === 'forbidden') && (
        <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
          <p className="text-sm font-medium text-ink-200">
            {loadState === 'forbidden' ? 'You don’t have access to this smart list.' : 'Smart list not found'}
          </p>
          <Link
            to="/smart-lists"
            className="mt-4 inline-block text-sm text-gold-400 hover:text-gold-400/80"
          >
            Back to Smart Lists
          </Link>
        </div>
      )}

      {loadState === 'ready' && list && (
        <>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink-100 sm:text-4xl">
                {list.name}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ink-400">
                {describeSmartListFilter(filter, tags)}
              </p>
              <p className="mt-2 text-xs text-ink-500">
                {matchedHymns.length === 1 ? '1 matching hymn' : `${matchedHymns.length} matching hymns`}
                {' · '}
                live results · no stored hymn IDs
              </p>
            </div>
            <Link
              to={`/smart-lists/${list.id}/edit`}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-ink-600 px-3.5 py-2 text-sm text-ink-300 transition hover:border-gold-500/40 hover:text-gold-400"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit filters
            </Link>
          </div>

          <div className="mb-6">
            <label
              htmlFor="smart-list-search"
              className="mb-2 block text-xs font-medium tracking-wide text-ink-400 uppercase"
            >
              Search within results
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <input
                id="smart-list-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Narrow by name…"
                className="w-full rounded-xl border border-ink-600 bg-ink-900/50 py-2.5 pr-3.5 pl-10 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
              />
            </div>
          </div>

          {matchedHymns.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
              <p className="text-sm text-ink-400">No hymns match this filter right now.</p>
              <Link
                to={`/smart-lists/${list.id}/edit`}
                className="mt-4 inline-block text-sm text-gold-400 hover:text-gold-400/80"
              >
                Edit filters
              </Link>
            </div>
          )}

          {matchedHymns.length > 0 && displayed.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
              <p className="text-sm text-ink-400">No results match your search.</p>
            </div>
          )}

          {displayed.length > 0 && (
            <ul className="grid gap-3 lg:grid-cols-2">
              {displayed.map((hymn) => (
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
          )}
        </>
      )}
    </div>
  )
}
