import { useEffect, useId, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { addListItem, createUserList, ensureSystemLists, listListItems, listUserLists, nextListItemOrder, sortUserLists } from '../../services/listService'
import type { UserList } from '../../types'

interface AddToListDialogProps {
  open: boolean
  userId: string
  hymnId: string
  hymnName: string
  onClose: () => void
}

export function AddToListDialog({
  open,
  userId,
  hymnId,
  hymnName,
  onClose,
}: AddToListDialogProps) {
  const titleId = useId()
  const [lists, setLists] = useState<UserList[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setSuccess(null)
      setNewName('')
      try {
        await ensureSystemLists(userId)
        const data = await listUserLists(userId)
        if (!cancelled) setLists(sortUserLists(data.filter((list) => list.type !== 'smart')))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load lists.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, userId])

  if (!open) return null

  async function addToList(list: UserList) {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const items = await listListItems(list.id, userId)
      if (items.some((item) => item.hymnId === hymnId)) {
        setSuccess(`Already in “${list.name}”.`)
        setBusy(false)
        return
      }
      await addListItem({
        listId: list.id,
        userId,
        hymnId,
        order: nextListItemOrder(items),
      })
      setSuccess(`Added to “${list.name}”.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to list.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    const name = newName.trim()
    if (!name) {
      setError('List name is required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const list = await createUserList({ userId, name, type: 'manual' })
      await addListItem({ listId: list.id, userId, hymnId, order: 0 })
      setLists((current) => sortUserLists([...current, list]))
      setNewName('')
      setSuccess(`Created “${list.name}” and added the hymn.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create list.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink-950/70" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="safe-area-pb relative z-10 max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-ink-700 bg-ink-850 p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-xl font-semibold text-ink-100">
              Add to list
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              Add <span className="text-ink-200">{hymnName}</span> to one of your personal lists.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target shrink-0 rounded-xl border border-ink-600 text-ink-400 transition hover:bg-ink-700/60 hover:text-ink-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-ink-500">Loading lists…</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {lists.length === 0 && (
              <li className="rounded-xl border border-dashed border-ink-600 px-3 py-4 text-center text-sm text-ink-500">
                No lists yet. Create one below.
              </li>
            )}
            {lists.map((list) => (
              <li key={list.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void addToList(list)}
                  className="flex min-h-12 w-full items-center justify-between rounded-xl border border-ink-600 bg-ink-900/40 px-3.5 py-3 text-left text-sm text-ink-200 transition hover:border-gold-500/40 hover:text-gold-400 disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    {list.name}
                    {list.type === 'system' && (
                      <span className="text-[10px] tracking-wide text-ink-500 uppercase">System</span>
                    )}
                  </span>
                  <span className="text-xs text-ink-500">Add</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleCreate} className="space-y-3 border-t border-ink-700/60 pt-4">
          <label htmlFor="new-list-name" className="block text-xs font-medium tracking-wide text-ink-400 uppercase">
            New list
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="new-list-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              disabled={busy}
              placeholder="List name"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-ink-600 bg-ink-900/60 px-3 py-2.5 text-base text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30 sm:text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gold-400 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>

        {error && (
          <p className="mt-3 rounded-xl border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-sm text-ember-500">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-sm text-gold-400">
            {success}
          </p>
        )}
      </div>
    </div>
  )
}
