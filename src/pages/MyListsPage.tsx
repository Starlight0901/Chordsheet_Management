import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ListMusic, Plus } from 'lucide-react'
import { ListCard } from '../components/lists/ListCard'
import { useAuth } from '../context/AuthContext'
import {
  createUserList,
  deleteUserList,
  ensureSystemLists,
  listAllUserListItems,
  listManualAndSystemLists,
  updateUserList,
} from '../services/listService'
import type { UserList } from '../types'

type LoadState = 'loading' | 'ready' | 'error'

export function MyListsPage() {
  const { currentUser } = useAuth()
  const [lists, setLists] = useState<UserList[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  async function loadLists(userId: string) {
    await ensureSystemLists(userId)
    const [userLists, items] = await Promise.all([
      listManualAndSystemLists(userId),
      listAllUserListItems(userId),
    ])
    const nextCounts: Record<string, number> = {}
    for (const item of items) {
      nextCounts[item.listId] = (nextCounts[item.listId] ?? 0) + 1
    }
    setLists(userLists)
    setCounts(nextCounts)
  }

  useEffect(() => {
    if (!currentUser) {
      setLists([])
      setLoadState('ready')
      return
    }

    let cancelled = false

    async function load() {
      setLoadState('loading')
      setErrorMessage(null)
      try {
        await loadLists(currentUser!.uid)
        if (!cancelled) setLoadState('ready')
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load lists.')
        setLoadState('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [currentUser])

  const totalHymns = useMemo(
    () => Object.values(counts).reduce((sum, n) => sum + n, 0),
    [counts],
  )

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!currentUser) return
    const name = newName.trim()
    if (!name) return

    setCreating(true)
    setErrorMessage(null)
    try {
      await createUserList({ userId: currentUser.uid, name, type: 'manual' })
      setNewName('')
      await loadLists(currentUser.uid)
      setLoadState('ready')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create list.')
    } finally {
      setCreating(false)
    }
  }

  async function handleRename(listId: string) {
    if (!currentUser) return
    const name = renameValue.trim()
    if (!name) return

    setBusyId(listId)
    setErrorMessage(null)
    try {
      await updateUserList(listId, { name })
      setRenamingId(null)
      await loadLists(currentUser.uid)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to rename list.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(list: UserList) {
    if (!currentUser || list.type === 'system') return
    const ok = window.confirm(`Delete list “${list.name}”? Hymns stay in the library.`)
    if (!ok) return

    setBusyId(list.id)
    setErrorMessage(null)
    try {
      await deleteUserList(list.id)
      await loadLists(currentUser.uid)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete list.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6 sm:mb-8">
        <p className="mb-2 text-sm font-medium tracking-[0.18em] text-gold-500 uppercase">
          Personal
        </p>
        <h2 className="font-display text-3xl font-semibold text-ink-100 sm:text-4xl">My lists</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300 sm:text-base">
          Private manual lists for practice and ministry. For saved filters that update
          automatically, use{' '}
          <Link to="/smart-lists" className="text-gold-400 hover:text-gold-400/80">
            Smart Lists
          </Link>
          .
        </p>
      </div>

      <form
        onSubmit={(event) => void handleCreate(event)}
        className="mb-6 flex flex-col gap-2 rounded-2xl border border-ink-700/70 bg-ink-800/40 p-4 sm:flex-row sm:items-end sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <label
            htmlFor="new-custom-list"
            className="mb-2 block text-xs font-medium tracking-wide text-ink-400 uppercase"
          >
            New custom list
          </label>
          <input
            id="new-custom-list"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            disabled={creating}
            placeholder="e.g. Sunday, Youth, Songs I Can Lead"
            className="w-full rounded-xl border border-ink-600 bg-ink-900/50 px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          />
        </div>
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gold-400 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Create
        </button>
      </form>

      {errorMessage && loadState !== 'error' && (
        <p className="mb-4 rounded-xl border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-sm text-ember-500">
          {errorMessage}
        </p>
      )}

      {loadState === 'loading' && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-700/70 bg-ink-800/30 px-6 py-20">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-gold-400" />
          <p className="text-sm text-ink-400">Loading lists…</p>
        </div>
      )}

      {loadState === 'error' && (
        <div className="rounded-2xl border border-ember-500/40 bg-ember-500/10 px-6 py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-ember-500" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink-100">Couldn’t load lists</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">{errorMessage}</p>
        </div>
      )}

      {loadState === 'ready' && lists.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
          <ListMusic className="mx-auto mb-3 h-8 w-8 text-ink-500" strokeWidth={1.5} />
          <p className="text-sm text-ink-400">No lists yet.</p>
        </div>
      )}

      {loadState === 'ready' && lists.length > 0 && (
        <>
          <p className="mb-3 text-xs text-ink-500">
            {lists.length} {lists.length === 1 ? 'list' : 'lists'}
            {totalHymns > 0 ? ` · ${totalHymns} hymn references` : ''}
          </p>
          <ul className="grid gap-3 lg:grid-cols-2">
            {lists.map((list) => (
              <li key={list.id}>
                <ListCard
                  list={list}
                  hymnCount={counts[list.id] ?? 0}
                  renaming={renamingId === list.id}
                  renameValue={renameValue}
                  busy={busyId === list.id}
                  onRenameValueChange={setRenameValue}
                  onStartRename={() => {
                    setRenamingId(list.id)
                    setRenameValue(list.name)
                  }}
                  onCancelRename={() => setRenamingId(null)}
                  onConfirmRename={() => void handleRename(list.id)}
                  onDelete={() => void handleDelete(list)}
                />
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-ink-500">
            Add hymns from{' '}
            <Link to="/hymns" className="text-gold-400 hover:text-gold-400/80">
              Hymn Details
            </Link>{' '}
            using Add to List.
          </p>
        </>
      )}
    </div>
  )
}
