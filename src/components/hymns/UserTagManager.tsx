import { useEffect, useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  createUserTag,
  deleteUserTag,
  listUserTags,
  renameUserTag,
} from '../../services/tagService'
import type { UserTag } from '../../types'
import { cn } from '../../utils/cn'

interface UserTagManagerProps {
  userId: string
  className?: string
  onTagsChange?: (tags: UserTag[]) => void
}

/**
 * Create / rename / delete the signed-in user's private tags.
 * Does not manage global hymn categories.
 */
export function UserTagManager({ userId, className, onTagsChange }: UserTagManagerProps) {
  const [tags, setTags] = useState<UserTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  async function refresh() {
    const data = await listUserTags(userId)
    setTags(data)
    onTagsChange?.(data)
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await listUserTags(userId)
        if (cancelled) return
        setTags(data)
        onTagsChange?.(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load tags.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    setError(null)
    try {
      await createUserTag({ userId, name })
      setNewName('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag.')
    } finally {
      setCreating(false)
    }
  }

  async function handleRename(tagId: string) {
    const name = editName.trim()
    if (!name) return
    setBusyId(tagId)
    setError(null)
    try {
      await renameUserTag(tagId, name)
      setEditingId(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename tag.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(tag: UserTag) {
    const ok = window.confirm(
      `Delete tag “${tag.name}”? It will be removed from all of your hymns.`,
    )
    if (!ok) return
    setBusyId(tag.id)
    setError(null)
    try {
      await deleteUserTag(tag.id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={cn('rounded-2xl border border-ink-700/70 bg-ink-800/40 p-4 sm:p-5', className)}>
      <div className="mb-4">
        <h3 className="text-sm font-medium text-ink-100">Your private tags</h3>
        <p className="mt-1 text-xs text-ink-500">
          Personal organization only (e.g. Need Practice, Guitar). Not shared global categories.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-500">Loading tags…</p>
      ) : (
        <ul className="mb-4 space-y-2">
          {tags.length === 0 && (
            <li className="rounded-xl border border-dashed border-ink-600 px-3 py-4 text-center text-sm text-ink-500">
              No tags yet.
            </li>
          )}
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center gap-2 rounded-xl border border-ink-700/70 bg-ink-900/40 px-3 py-2"
            >
              {editingId === tag.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void handleRename(tag.id)
                      }
                      if (event.key === 'Escape') setEditingId(null)
                    }}
                    disabled={busyId === tag.id}
                    className="min-w-0 flex-1 rounded-lg border border-ink-600 bg-ink-900 px-2.5 py-1.5 text-sm text-ink-100 focus:border-gold-500/50 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    aria-label="Save name"
                    disabled={busyId === tag.id}
                    onClick={() => void handleRename(tag.id)}
                    className="rounded-lg border border-ink-600 p-1.5 text-gold-400 hover:bg-ink-700/50 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancel"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-ink-600 p-1.5 text-ink-400 hover:bg-ink-700/50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-200">{tag.name}</span>
                  <button
                    type="button"
                    aria-label={`Rename ${tag.name}`}
                    disabled={busyId === tag.id}
                    onClick={() => {
                      setEditingId(tag.id)
                      setEditName(tag.name)
                    }}
                    className="rounded-lg border border-ink-600 p-1.5 text-ink-400 transition hover:text-gold-400 disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${tag.name}`}
                    disabled={busyId === tag.id}
                    onClick={() => void handleDelete(tag)}
                    className="rounded-lg border border-ink-600 p-1.5 text-ink-400 transition hover:text-ember-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void handleCreate()
            }
          }}
          disabled={creating}
          placeholder="Create tag…"
          className="min-w-0 flex-1 rounded-xl border border-ink-600 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
        />
        <button
          type="button"
          disabled={creating || !newName.trim()}
          onClick={() => void handleCreate()}
          className="inline-flex items-center gap-1 rounded-xl bg-gold-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-gold-400 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Create
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-ember-500">{error}</p>}
    </div>
  )
}
