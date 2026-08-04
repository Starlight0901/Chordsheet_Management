import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { HymnFilterPanel } from '../components/filters/HymnFilterPanel'
import { ListHymnReorderList, type ListHymnRow } from '../components/lists/ListHymnReorderList'
import { useAuth } from '../context/AuthContext'
import { listHymns } from '../services/hymnService'
import {
  getUserList,
  listListItems,
  removeListItem,
  reorderListItems,
} from '../services/listService'
import { listAllUserHymnTags, listUserTags } from '../services/tagService'
import type { UserList, UserTag } from '../types'
import {
  buildHymnTagMap,
  createEmptyHymnFilter,
  filterHymns,
  hasActiveHymnFilters,
  toHymnFilterOptions,
  type HymnFilterState,
} from '../utils/hymnFilters'

type LoadState = 'loading' | 'ready' | 'error' | 'missing' | 'forbidden' | 'smart'

export function ListDetailPage() {
  const { listId } = useParams<{ listId: string }>()
  const { currentUser } = useAuth()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [list, setList] = useState<UserList | null>(null)
  const [rows, setRows] = useState<ListHymnRow[]>([])
  const [userTags, setUserTags] = useState<UserTag[]>([])
  const [hymnTagMap, setHymnTagMap] = useState<Map<string, Set<string>>>(new Map())
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null)
  const [reorderBusy, setReorderBusy] = useState(false)
  const [filter, setFilter] = useState<HymnFilterState>(createEmptyHymnFilter)

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
        const [listDoc, items] = await Promise.all([
          getUserList(listId!),
          listListItems(listId!, userId),
        ])

        if (cancelled) return

        if (!listDoc) {
          setLoadState('missing')
          return
        }

        if (listDoc.userId !== userId) {
          setLoadState('forbidden')
          return
        }

        if (listDoc.type === 'smart') {
          setList(listDoc)
          setLoadState('smart')
          return
        }

        let library: Awaited<ReturnType<typeof listHymns>>
        try {
          library = await listHymns()
        } catch (error) {
          if (cancelled) return
          // Do not render an empty list when hymns failed to load — that hides real items.
          if (items.length > 0) {
            setList(listDoc)
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load hymns for this list.')
            setLoadState('error')
            return
          }
          library = []
        }
        if (cancelled) return

        const byId = new Map(library.map((hymn) => [hymn.id, hymn]))
        const nextRows: ListHymnRow[] = []
        for (const item of items) {
          const hymn = byId.get(item.hymnId)
          if (hymn) {
            nextRows.push({ itemId: item.id, hymn, order: item.order })
          }
        }

        setList(listDoc)
        setRows(nextRows)
        setLoadState('ready')

        const [tags, hymnTags] = await Promise.all([
          listUserTags(userId).catch(() => []),
          listAllUserHymnTags(userId).catch(() => []),
        ])
        if (cancelled) return

        setUserTags(tags)
        setHymnTagMap(buildHymnTagMap(hymnTags))
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load list.')
        setLoadState('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [listId, currentUser])

  const hasActiveFilters = hasActiveHymnFilters(filter)

  const filteredRows = useMemo(() => {
    if (!hasActiveFilters) return rows

    const hymns = rows.map((row) => row.hymn)
    const matched = new Set(
      filterHymns(hymns, toHymnFilterOptions(filter, hymnTagMap)).map((hymn) => hymn.id),
    )

    return rows.filter((row) => matched.has(row.hymn.id))
  }, [rows, hasActiveFilters, filter, hymnTagMap])

  async function handleReorder(next: ListHymnRow[]) {
    const previous = rows
    setRows(next)
    setReorderBusy(true)
    try {
      await reorderListItems(next.map((row) => row.itemId))
    } catch {
      setRows(previous)
    } finally {
      setReorderBusy(false)
    }
  }

  async function handleRemove(itemId: string) {
    setRemoveBusyId(itemId)
    const previous = rows
    setRows((current) => current.filter((row) => row.itemId !== itemId))
    try {
      await removeListItem(itemId)
      const remaining = previous.filter((row) => row.itemId !== itemId)
      if (remaining.length > 0) {
        await reorderListItems(remaining.map((row) => row.itemId))
        setRows(remaining.map((row, index) => ({ ...row, order: index })))
      }
    } catch {
      setRows(previous)
    } finally {
      setRemoveBusyId(null)
    }
  }

  if (loadState === 'smart' && list) {
    return <Navigate to={`/smart-lists/${list.id}`} replace />
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link
        to="/lists"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 transition hover:text-gold-400"
      >
        <ArrowLeft className="h-4 w-4" />
        All lists
      </Link>

      {loadState === 'loading' && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-700/70 bg-ink-800/30 px-6 py-20">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-gold-400" />
          <p className="text-sm text-ink-400">Loading list…</p>
        </div>
      )}

      {loadState === 'error' && (
        <div className="rounded-2xl border border-ember-500/40 bg-ember-500/10 px-6 py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-ember-500" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink-100">Couldn’t load this list</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">{errorMessage}</p>
        </div>
      )}

      {(loadState === 'missing' || loadState === 'forbidden') && (
        <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
          <p className="text-sm font-medium text-ink-200">
            {loadState === 'forbidden' ? 'You don’t have access to this list.' : 'List not found'}
          </p>
          <Link to="/lists" className="mt-4 inline-block text-sm text-gold-400 hover:text-gold-400/80">
            Back to My Lists
          </Link>
        </div>
      )}

      {loadState === 'ready' && list && (
        <>
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-3xl font-semibold text-ink-100 sm:text-4xl">
                {list.name}
              </h2>
              {list.type === 'system' && (
                <span className="rounded-full border border-ink-600 px-2 py-0.5 text-[10px] tracking-wide text-ink-400 uppercase">
                  System
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-ink-400">
              {rows.length === 1 ? '1 hymn' : `${rows.length} hymns`}
              {hasActiveFilters ? ` · showing ${filteredRows.length}` : ''}
              {' · '}
              private to you
            </p>
          </div>

          <div className="mb-6">
            <HymnFilterPanel
              value={filter}
              onChange={setFilter}
              userTags={userTags}
              searchPlaceholder="Search within this list…"
            />
          </div>

          {hasActiveFilters && (
            <p className="mb-3 text-xs text-ink-500">
              Clear search & filters to drag and reorder hymns.
            </p>
          )}

          {rows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
              <p className="text-sm text-ink-400">This list is empty.</p>
              <Link
                to="/hymns"
                className="mt-4 inline-block text-sm text-gold-400 hover:text-gold-400/80"
              >
                Browse hymn library
              </Link>
            </div>
          )}

          {rows.length > 0 && filteredRows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
              <p className="text-sm text-ink-400">No hymns match these filters.</p>
              <button
                type="button"
                onClick={() => setFilter(createEmptyHymnFilter())}
                className="mt-4 text-sm text-gold-400 hover:text-gold-400/80"
              >
                Clear search & filters
              </button>
            </div>
          )}

          {filteredRows.length > 0 && (
            <ListHymnReorderList
              rows={hasActiveFilters ? filteredRows : rows}
              onReorder={(next) => {
                if (hasActiveFilters) return
                void handleReorder(next)
              }}
              onRemove={(itemId) => void handleRemove(itemId)}
              reorderDisabled={hasActiveFilters || reorderBusy}
              removeBusyId={removeBusyId}
            />
          )}
        </>
      )}
    </div>
  )
}
