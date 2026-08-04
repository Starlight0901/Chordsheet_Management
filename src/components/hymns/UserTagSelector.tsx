import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  assignTagToHymn,
  createUserTag,
  listTagsForHymn,
  listUserTags,
  removeTagFromHymn,
} from '../../services/tagService'
import type { UserTag } from '../../types'
import { cn } from '../../utils/cn'

interface UserTagSelectorProps {
  userId: string
  hymnId: string
  className?: string
  /** Called when hymn↔tag assignments change. */
  onChange?: (assignedTagIds: string[]) => void
}

/**
 * Assign / remove the current user's private tags on a hymn.
 * Never mixes with global categories.
 */
export function UserTagSelector({ userId, hymnId, className, onChange }: UserTagSelectorProps) {
  const [allTags, setAllTags] = useState<UserTag[]>([])
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [tags, links] = await Promise.all([
          listUserTags(userId),
          listTagsForHymn(userId, hymnId),
        ])
        if (cancelled) return
        setAllTags(tags)
        const ids = new Set(links.map((link) => link.tagId))
        setAssignedIds(ids)
        onChange?.(Array.from(ids))
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
    // Intentionally omit onChange from deps to avoid re-fetch loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, hymnId])

  async function toggleTag(tag: UserTag) {
    setBusyId(tag.id)
    setError(null)
    const nextAssigned = new Set(assignedIds)
    try {
      if (assignedIds.has(tag.id)) {
        await removeTagFromHymn(userId, hymnId, tag.id)
        nextAssigned.delete(tag.id)
      } else {
        await assignTagToHymn(userId, hymnId, tag.id)
        nextAssigned.add(tag.id)
      }
      setAssignedIds(nextAssigned)
      onChange?.(Array.from(nextAssigned))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tag.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    setError(null)
    try {
      const tag = await createUserTag({ userId, name })
      await assignTagToHymn(userId, hymnId, tag.id)
      setAllTags((current) =>
        [...current, tag].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
      )
      const next = new Set(assignedIds)
      next.add(tag.id)
      setAssignedIds(next)
      onChange?.(Array.from(next))
      setNewName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag.')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return <p className={cn('text-sm text-ink-500', className)}>Loading tags…</p>
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink-100">Your tags</p>
          <p className="mt-0.5 text-xs text-ink-500">Private to you — not global categories.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {allTags.length === 0 && (
          <p className="text-sm text-ink-500">No tags yet. Create one below.</p>
        )}
        {allTags.map((tag) => {
          const selected = assignedIds.has(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              disabled={busyId === tag.id}
              aria-pressed={selected}
              onClick={() => void toggleTag(tag)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition disabled:opacity-50',
                selected
                  ? 'border-gold-500/45 bg-gold-500/15 font-medium text-gold-400'
                  : 'border-ink-600 bg-ink-900/40 text-ink-300 hover:border-ink-500 hover:text-ink-100',
              )}
            >
              {tag.name}
              {selected && <X className="h-3 w-3 opacity-70" />}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex gap-2">
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
          placeholder="New tag (e.g. Need Practice)"
          className="min-w-0 flex-1 rounded-xl border border-ink-600 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
        />
        <button
          type="button"
          disabled={creating || !newName.trim()}
          onClick={() => void handleCreate()}
          className="inline-flex items-center gap-1 rounded-xl border border-ink-600 px-3 py-2 text-sm text-ink-300 transition hover:border-gold-500/40 hover:text-gold-400 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-ember-500">{error}</p>}
    </div>
  )
}
