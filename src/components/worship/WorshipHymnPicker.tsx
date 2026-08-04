import { useEffect, useMemo, useState } from 'react'
import { Heart, ListMusic, Music2, Sparkles, X } from 'lucide-react'
import { HymnFilterPanel } from '../filters/HymnFilterPanel'
import { TaxonomyBadges } from '../taxonomy'
import { useAuth } from '../../context/AuthContext'
import { listChordSheetsByHymn } from '../../services/chordSheetService'
import { listFavorites } from '../../services/favoriteService'
import { listHymns } from '../../services/hymnService'
import {
  listListItems,
  listManualAndSystemLists,
  listSmartLists,
} from '../../services/listService'
import { listAllUserHymnTags, listUserTags } from '../../services/tagService'
import type { ChordSheet, Hymn, UserList, UserTag } from '../../types'
import {
  buildHymnTagMap,
  createEmptyHymnFilter,
  evaluateSmartList,
  filterHymns,
  sanitizeSmartListFilter,
  toHymnFilterOptions,
  type HymnFilterState,
} from '../../utils/hymnFilters'
import { cn } from '../../utils/cn'

export type WorshipHymnSource = 'library' | 'lists' | 'smart' | 'favorites'

export interface WorshipHymnSelection {
  hymn: Hymn
  chordSheetId?: string
}

interface WorshipHymnPickerProps {
  onSelect: (selection: WorshipHymnSelection) => void | Promise<void>
  /** When true, picker is shown as a modal dialog. */
  open?: boolean
  onClose?: () => void
  busy?: boolean
  className?: string
}

const SOURCE_OPTIONS: Array<{
  id: WorshipHymnSource
  label: string
  icon: typeof Music2
}> = [
  { id: 'library', label: 'Library', icon: Music2 },
  { id: 'lists', label: 'My Lists', icon: ListMusic },
  { id: 'smart', label: 'Smart Lists', icon: Sparkles },
  { id: 'favorites', label: 'Favorites', icon: Heart },
]

/**
 * Hymn picker for worship plans — library, personal lists, smart lists, favorites.
 * After choosing a hymn, the user selects which chord sheet to use.
 */
export function WorshipHymnPicker({
  onSelect,
  open = true,
  onClose,
  busy,
  className,
}: WorshipHymnPickerProps) {
  const { currentUser } = useAuth()
  const [source, setSource] = useState<WorshipHymnSource>('library')
  const [hymns, setHymns] = useState<Hymn[]>([])
  const [userTags, setUserTags] = useState<UserTag[]>([])
  const [hymnTagMap, setHymnTagMap] = useState<Map<string, Set<string>>>(new Map())
  const [manualLists, setManualLists] = useState<UserList[]>([])
  const [smartLists, setSmartLists] = useState<UserList[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [selectedListId, setSelectedListId] = useState<string>('')
  const [listHymnIds, setListHymnIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<HymnFilterState>(createEmptyHymnFilter)
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pendingHymn, setPendingHymn] = useState<Hymn | null>(null)
  const [pendingSheets, setPendingSheets] = useState<ChordSheet[]>([])
  const [pendingSheetId, setPendingSheetId] = useState('')
  const [sheetsLoading, setSheetsLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const userId = currentUser?.uid
        const [hymnList, tags, links, manuals, smarts, favorites] = await Promise.all([
          listHymns(),
          userId ? listUserTags(userId) : Promise.resolve([]),
          userId ? listAllUserHymnTags(userId) : Promise.resolve([]),
          userId ? listManualAndSystemLists(userId) : Promise.resolve([]),
          userId ? listSmartLists(userId) : Promise.resolve([]),
          userId ? listFavorites(userId) : Promise.resolve([]),
        ])
        if (cancelled) return
        setHymns(hymnList)
        setUserTags(tags)
        setHymnTagMap(buildHymnTagMap(links))
        setManualLists(manuals)
        setSmartLists(smarts)
        setFavoriteIds(new Set(favorites.map((favorite) => favorite.hymnId)))
        setSelectedListId('')
        setListHymnIds(new Set())
        setPendingHymn(null)
        setFilter(createEmptyHymnFilter())
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load hymns.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [currentUser?.uid, open])

  useEffect(() => {
    if (!open || !selectedListId || (source !== 'lists' && source !== 'smart')) {
      setListHymnIds(new Set())
      return
    }

    if (source === 'smart') {
      const smart = smartLists.find((list) => list.id === selectedListId)
      if (!smart) {
        setListHymnIds(new Set())
        return
      }
      const matched = evaluateSmartList(
        hymns,
        sanitizeSmartListFilter(smart.filter),
        hymnTagMap,
      )
      setListHymnIds(new Set(matched.map((hymn) => hymn.id)))
      return
    }

    let cancelled = false

    async function loadManualItems() {
      const uid = currentUser?.uid
      if (!uid) {
        setListHymnIds(new Set())
        setListLoading(false)
        return
      }
      setListLoading(true)
      try {
        const items = await listListItems(selectedListId, uid)
        if (cancelled) return
        setListHymnIds(new Set(items.map((item) => item.hymnId)))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load list hymns.')
          setListHymnIds(new Set())
        }
      } finally {
        if (!cancelled) setListLoading(false)
      }
    }

    void loadManualItems()
    return () => {
      cancelled = true
    }
  }, [open, selectedListId, source, smartLists, hymns, hymnTagMap, currentUser?.uid])

  const sourceHymns = useMemo(() => {
    if (source === 'library') return hymns
    if (source === 'favorites') return hymns.filter((hymn) => favoriteIds.has(hymn.id))
    if (source === 'lists' || source === 'smart') {
      if (!selectedListId) return []
      return hymns.filter((hymn) => listHymnIds.has(hymn.id))
    }
    return hymns
  }, [source, hymns, favoriteIds, selectedListId, listHymnIds])

  const filtered = useMemo(
    () => filterHymns(sourceHymns, toHymnFilterOptions(filter, hymnTagMap)),
    [sourceHymns, filter, hymnTagMap],
  )

  const listsForSource = source === 'smart' ? smartLists : manualLists

  async function beginChordSheetPick(hymn: Hymn) {
    setSheetsLoading(true)
    setError(null)
    setPendingHymn(hymn)
    setPendingSheets([])
    setPendingSheetId('')
    try {
      const sheets = await listChordSheetsByHymn(hymn.id)
      setPendingSheets(sheets)
      setPendingSheetId(sheets[0]?.id ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chord sheets.')
      setPendingHymn(null)
    } finally {
      setSheetsLoading(false)
    }
  }

  async function confirmSelection() {
    if (!pendingHymn) return
    await onSelect({
      hymn: pendingHymn,
      chordSheetId: pendingSheetId || undefined,
    })
    setPendingHymn(null)
    setPendingSheets([])
    setPendingSheetId('')
  }

  if (!open) return null

  const body = (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-ink-100">Add hymn</h3>
          <p className="mt-1 text-xs text-ink-500">
            Search the library, lists, smart lists, or favorites — then pick a chord sheet.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-ink-600 p-2 text-ink-400 transition hover:bg-ink-700/60 hover:text-ink-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SOURCE_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            disabled={busy}
            onClick={() => {
              setSource(id)
              setSelectedListId('')
              setPendingHymn(null)
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition',
              source === id
                ? 'border-gold-500/50 bg-gold-500/10 text-gold-400'
                : 'border-ink-600 text-ink-400 hover:border-ink-500 hover:text-ink-200',
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      {(source === 'lists' || source === 'smart') && (
        <div>
          <label
            htmlFor="worship-picker-list"
            className="mb-2 block text-xs font-medium tracking-wide text-ink-400 uppercase"
          >
            {source === 'smart' ? 'Smart list' : 'List'}
          </label>
          <select
            id="worship-picker-list"
            value={selectedListId}
            disabled={busy || loading}
            onChange={(event) => setSelectedListId(event.target.value)}
            className="w-full rounded-xl border border-ink-600 bg-ink-900/50 px-3 py-2.5 text-sm text-ink-100 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          >
            <option value="">Select a {source === 'smart' ? 'smart list' : 'list'}…</option>
            {listsForSource.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
          {!loading && listsForSource.length === 0 && (
            <p className="mt-2 text-xs text-ink-500">
              {source === 'smart' ? 'No smart lists yet.' : 'No personal lists yet.'}
            </p>
          )}
        </div>
      )}

      <HymnFilterPanel
        value={filter}
        onChange={setFilter}
        userTags={userTags}
        showUserTags={Boolean(currentUser)}
        searchPlaceholder="Search hymns to add…"
      />

      {loading && <p className="text-sm text-ink-500">Loading hymns…</p>}
      {listLoading && <p className="text-sm text-ink-500">Loading list…</p>}
      {error && <p className="text-sm text-ember-500">{error}</p>}

      {!loading && !error && !pendingHymn && (
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {(source === 'lists' || source === 'smart') && !selectedListId && (
            <li className="rounded-xl border border-dashed border-ink-600 px-3 py-6 text-center text-sm text-ink-500">
              Choose a {source === 'smart' ? 'smart list' : 'list'} above.
            </li>
          )}
          {((source !== 'lists' && source !== 'smart') || selectedListId) &&
            filtered.length === 0 &&
            !listLoading && (
              <li className="rounded-xl border border-dashed border-ink-600 px-3 py-6 text-center text-sm text-ink-500">
                No matching hymns.
              </li>
            )}
          {filtered.map((hymn) => (
            <li key={hymn.id}>
              <button
                type="button"
                disabled={busy || sheetsLoading}
                onClick={() => void beginChordSheetPick(hymn)}
                className="flex w-full items-start gap-3 rounded-xl border border-ink-600 bg-ink-900/40 px-3 py-2.5 text-left text-ink-200 transition hover:border-gold-500/40 hover:text-gold-400 disabled:opacity-50"
              >
                <Music2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" strokeWidth={1.75} />
                <div className="min-w-0">
                  <p className="font-medium">{hymn.name}</p>
                  <TaxonomyBadges
                    languages={hymn.languages}
                    categories={hymn.categories}
                    className="mt-1.5"
                  />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pendingHymn && (
        <div className="space-y-3 rounded-xl border border-ink-600 bg-ink-900/40 p-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-ink-500 uppercase">
              Chord sheet for
            </p>
            <p className="mt-1 font-medium text-ink-100">{pendingHymn.name}</p>
          </div>

          {sheetsLoading ? (
            <p className="text-sm text-ink-500">Loading chord sheets…</p>
          ) : pendingSheets.length === 0 ? (
            <p className="text-sm text-ink-400">
              This hymn has no chord sheets yet. You can still add it without one.
            </p>
          ) : (
            <ul className="space-y-2">
              {pendingSheets.map((sheet, index) => (
                <li key={sheet.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-ink-700 px-3 py-2 has-[:checked]:border-gold-500/50 has-[:checked]:bg-gold-500/10">
                    <input
                      type="radio"
                      name="worship-chord-sheet"
                      value={sheet.id}
                      checked={pendingSheetId === sheet.id}
                      onChange={() => setPendingSheetId(sheet.id)}
                      disabled={busy}
                      className="accent-gold-500"
                    />
                    <span className="min-w-0 text-sm text-ink-200">
                      {sheet.originalFileName || `Sheet ${index + 1}`}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setPendingHymn(null)
                setPendingSheets([])
              }}
              className="rounded-xl border border-ink-600 px-3 py-2 text-sm text-ink-300 transition hover:bg-ink-700/50 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={busy || sheetsLoading}
              onClick={() => void confirmSelection()}
              className="rounded-xl bg-gold-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-gold-400 disabled:opacity-50"
            >
              {busy ? 'Adding…' : 'Add to plan'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  if (!onClose) return body

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-ink-950/70"
        onClick={onClose}
        disabled={busy}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink-700 bg-ink-850 p-5 shadow-xl"
      >
        {body}
      </div>
    </div>
  )
}
