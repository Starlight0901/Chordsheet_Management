import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { FilterBuilder } from '../components/filters/FilterBuilder'
import { useAuth } from '../context/AuthContext'
import {
  createSmartList,
  getUserList,
  updateUserList,
} from '../services/listService'
import { listUserTags } from '../services/tagService'
import type { SmartListFilter, UserTag } from '../types'
import {
  createEmptySmartListFilter,
  hasActiveSmartListFilter,
  sanitizeSmartListFilter,
} from '../utils/hymnFilters'

type Mode = 'create' | 'edit'
type LoadState = 'idle' | 'loading' | 'ready' | 'missing' | 'error'

export function SmartListEditorPage() {
  const { listId } = useParams<{ listId: string }>()
  const mode: Mode = listId ? 'edit' : 'create'
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [filter, setFilter] = useState<SmartListFilter>(createEmptySmartListFilter)
  const [userTags, setUserTags] = useState<UserTag[]>([])
  const [loadState, setLoadState] = useState<LoadState>(mode === 'edit' ? 'loading' : 'ready')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser) return
    let cancelled = false

    async function load() {
      try {
        const tags = await listUserTags(currentUser!.uid)
        if (!cancelled) setUserTags(tags)

        if (mode === 'edit' && listId) {
          setLoadState('loading')
          setError(null)
          const list = await getUserList(listId)
          if (cancelled) return
          if (!list || list.type !== 'smart' || list.userId !== currentUser!.uid) {
            setLoadState('missing')
            return
          }
          setName(list.name)
          setFilter(sanitizeSmartListFilter(list.filter))
          setLoadState('ready')
        } else if (!cancelled) {
          setLoadState('ready')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load.')
          setLoadState('error')
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [currentUser, listId, mode])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!currentUser || loadState !== 'ready') return

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required.')
      return
    }

    const clean = sanitizeSmartListFilter(filter)
    if (!hasActiveSmartListFilter(clean)) {
      setError('Choose at least one language, category, or personal tag.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (mode === 'create') {
        const list = await createSmartList({
          userId: currentUser.uid,
          name: trimmed,
          filter: clean,
        })
        navigate(`/smart-lists/${list.id}`, { replace: true })
      } else if (listId) {
        const existing = await getUserList(listId)
        if (!existing || existing.type !== 'smart' || existing.userId !== currentUser.uid) {
          setLoadState('missing')
          return
        }
        await updateUserList(listId, { name: trimmed, filter: clean })
        navigate(`/smart-lists/${listId}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save smart list.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        to={mode === 'edit' && listId ? `/smart-lists/${listId}` : '/smart-lists'}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 transition hover:text-gold-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="mb-6">
        <p className="mb-2 text-sm font-medium tracking-[0.18em] text-gold-500 uppercase">
          Smart list
        </p>
        <h2 className="font-display text-3xl font-semibold text-ink-100 sm:text-4xl">
          {mode === 'create' ? 'Create smart list' : 'Edit filters'}
        </h2>
        <p className="mt-2 text-sm text-ink-400">
          Examples: Sinhala Repentance, Tamil Worship, Songs I Need To Practice.
        </p>
      </div>

      {loadState === 'loading' && <p className="text-sm text-ink-500">Loading…</p>}

      {loadState === 'missing' && (
        <div className="rounded-2xl border border-ember-500/40 bg-ember-500/10 px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink-100">Smart list not found</p>
          <p className="mt-2 text-sm text-ink-400">
            This list may have been deleted, or it is not a smart list.
          </p>
          <Link
            to="/smart-lists"
            className="mt-5 inline-block text-sm text-gold-400 transition hover:text-gold-400/80"
          >
            Back to smart lists
          </Link>
        </div>
      )}

      {loadState === 'error' && (
        <div className="rounded-2xl border border-ember-500/40 bg-ember-500/10 px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink-100">Couldn’t load smart list</p>
          <p className="mt-2 text-sm text-ink-400">{error}</p>
        </div>
      )}

      {loadState === 'ready' && (
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
          <div>
            <label
              htmlFor="smart-list-name"
              className="mb-2 block text-xs font-medium tracking-wide text-ink-400 uppercase"
            >
              Name
            </label>
            <input
              id="smart-list-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
              placeholder="e.g. Sinhala + English Praise"
              className="w-full rounded-xl border border-ink-600 bg-ink-900/50 px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
            />
          </div>

          <FilterBuilder
            value={filter}
            onChange={setFilter}
            userTags={userTags}
            disabled={saving}
          />

          {error && (
            <p className="rounded-xl border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-sm text-ember-500">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gold-400 disabled:opacity-50"
            >
              {saving ? 'Saving…' : mode === 'create' ? 'Create smart list' : 'Save filters'}
            </button>
            <Link
              to={mode === 'edit' && listId ? `/smart-lists/${listId}` : '/smart-lists'}
              className="rounded-xl border border-ink-600 px-4 py-2.5 text-sm text-ink-300 transition hover:border-ink-500 hover:text-ink-100"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
