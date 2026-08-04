import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Search } from 'lucide-react'
import { HymnCard } from '../components/hymns/HymnCard'
import { useAuth } from '../context/AuthContext'
import { getChordSheetCountsByHymn } from '../services/chordSheetService'
import { listFavorites, removeFavorite } from '../services/favoriteService'
import { listHymns } from '../services/hymnService'
import type { Hymn } from '../types'
import { matchesHymnName } from '../utils/hymnFilters'

type LoadState = 'loading' | 'ready' | 'error'

export function FavoritesPage() {
  const { currentUser } = useAuth()
  const [hymns, setHymns] = useState<Hymn[]>([])
  const [chordSheetCounts, setChordSheetCounts] = useState<Record<string, number>>({})
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!currentUser) {
      setHymns([])
      setLoadState('ready')
      return
    }

    let cancelled = false

    async function load() {
      setLoadState('loading')
      setErrorMessage(null)

      try {
        const userId = currentUser!.uid
        const favorites = await listFavorites(userId)
        if (cancelled) return

        const favoriteIdSet = new Set(favorites.map((favorite) => favorite.hymnId))
        // Library load must succeed before orphan prune — a failed listHymns()
        // would otherwise look like every favorite is orphaned and wipe them.
        const library = await listHymns()
        if (cancelled) return

        const byId = new Map(library.map((hymn) => [hymn.id, hymn]))
        const loaded: Hymn[] = []
        const orphans: string[] = []

        for (const favorite of favorites) {
          const hymn = byId.get(favorite.hymnId)
          if (hymn) loaded.push(hymn)
          else orphans.push(favorite.hymnId)
        }

        // Only prune when the full hymn library loaded successfully.
        if (orphans.length > 0) {
          void Promise.allSettled(orphans.map((hymnId) => removeFavorite(userId, hymnId)))
        }

        let counts: Record<string, number> = {}
        try {
          counts = await getChordSheetCountsByHymn()
        } catch {
          counts = {}
        }
        if (cancelled) return

        setHymns(loaded)
        setChordSheetCounts(counts)
        setFavoriteIds(new Set(loaded.map((hymn) => hymn.id).filter((id) => favoriteIdSet.has(id))))
        setLoadState('ready')
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load favorites.')
        setLoadState('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [currentUser])

  const filtered = useMemo(
    () => hymns.filter((hymn) => matchesHymnName(hymn.name, searchQuery)),
    [hymns, searchQuery],
  )

  async function handleToggleFavorite(hymnId: string, next: boolean) {
    if (!currentUser || next) return

    setFavoriteBusyId(hymnId)
    const previousHymns = hymns
    const previousIds = new Set(favoriteIds)
    setHymns((current) => current.filter((hymn) => hymn.id !== hymnId))
    setFavoriteIds((current) => {
      const nextSet = new Set(current)
      nextSet.delete(hymnId)
      return nextSet
    })

    try {
      await removeFavorite(currentUser.uid, hymnId)
    } catch {
      setHymns(previousHymns)
      setFavoriteIds(previousIds)
    } finally {
      setFavoriteBusyId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6 sm:mb-8">
        <p className="mb-2 text-sm font-medium tracking-[0.18em] text-gold-500 uppercase">
          Personal
        </p>
        <h2 className="font-display text-3xl font-semibold text-ink-100 sm:text-4xl">Favorites</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300 sm:text-base">
          Only your favorited hymns appear here. Favorites are private to your account.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-ink-700/70 bg-ink-800/40 p-4 sm:p-5">
        <label
          htmlFor="favorites-search"
          className="mb-2 block text-xs font-medium tracking-wide text-ink-400 uppercase"
        >
          Search
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            id="favorites-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search your favorites…"
            className="w-full rounded-xl border border-ink-600 bg-ink-900/50 py-2.5 pr-3.5 pl-10 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          />
        </div>
      </div>

      {loadState === 'loading' && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-700/70 bg-ink-800/30 px-6 py-20">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-gold-400" />
          <p className="text-sm text-ink-400">Loading favorites…</p>
        </div>
      )}

      {loadState === 'error' && (
        <div className="rounded-2xl border border-ember-500/40 bg-ember-500/10 px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink-100">Couldn’t load favorites</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">{errorMessage}</p>
        </div>
      )}

      {loadState === 'ready' && hymns.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
          <Heart className="mx-auto mb-3 h-8 w-8 text-ink-500" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink-200">No favorites yet</p>
          <p className="mt-2 text-sm text-ink-400">Tap the heart on any hymn to add it here.</p>
          <Link
            to="/hymns"
            className="mt-5 inline-block text-sm text-gold-400 transition hover:text-gold-400/80"
          >
            Browse hymn library
          </Link>
        </div>
      )}

      {loadState === 'ready' && hymns.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
          <p className="text-sm text-ink-400">No favorites match your search.</p>
        </div>
      )}

      {loadState === 'ready' && filtered.length > 0 && (
        <ul className="grid gap-3 lg:grid-cols-2">
          {filtered.map((hymn) => (
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
    </div>
  )
}
