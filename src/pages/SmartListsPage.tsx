import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Check, Filter, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  deleteUserList,
  listSmartLists,
  updateUserList,
} from '../services/listService'
import { listUserTags } from '../services/tagService'
import type { UserList, UserTag } from '../types'
import { describeSmartListFilter, sanitizeSmartListFilter } from '../utils/hymnFilters'

type LoadState = 'loading' | 'ready' | 'error'

export function SmartListsPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [lists, setLists] = useState<UserList[]>([])
  const [tags, setTags] = useState<UserTag[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const tagsById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags])

  async function refresh(userId: string) {
    const [smartLists, userTags] = await Promise.all([
      listSmartLists(userId),
      listUserTags(userId),
    ])
    setLists(smartLists)
    setTags(userTags)
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
        await refresh(currentUser!.uid)
        if (!cancelled) setLoadState('ready')
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load smart lists.')
        setLoadState('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [currentUser])

  async function handleRename(listId: string) {
    if (!currentUser) return
    const name = renameValue.trim()
    if (!name) return
    setBusyId(listId)
    setErrorMessage(null)
    try {
      await updateUserList(listId, { name })
      setRenamingId(null)
      await refresh(currentUser.uid)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to rename.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(list: UserList) {
    if (!currentUser) return
    const ok = window.confirm(
      `Delete smart list “${list.name}”? Only the filter definition is removed.`,
    )
    if (!ok) return
    setBusyId(list.id)
    setErrorMessage(null)
    try {
      await deleteUserList(list.id)
      await refresh(currentUser.uid)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium tracking-[0.18em] text-gold-500 uppercase">
            Dynamic
          </p>
          <h2 className="font-display text-3xl font-semibold text-ink-100 sm:text-4xl">
            Smart lists
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300 sm:text-base">
            Saved filters that update automatically as the hymn library changes. Separate from
            manual lists — no hymn IDs are stored.
          </p>
        </div>
        <Link
          to="/smart-lists/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gold-400"
        >
          <Plus className="h-4 w-4" />
          New smart list
        </Link>
      </div>

      {errorMessage && loadState !== 'error' && (
        <p className="mb-4 rounded-xl border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-sm text-ember-500">
          {errorMessage}
        </p>
      )}

      {loadState === 'loading' && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-700/70 bg-ink-800/30 px-6 py-20">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-gold-400" />
          <p className="text-sm text-ink-400">Loading smart lists…</p>
        </div>
      )}

      {loadState === 'error' && (
        <div className="rounded-2xl border border-ember-500/40 bg-ember-500/10 px-6 py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-ember-500" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink-100">Couldn’t load smart lists</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">{errorMessage}</p>
        </div>
      )}

      {loadState === 'ready' && lists.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-ink-500" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink-200">No smart lists yet</p>
          <p className="mt-2 text-sm text-ink-400">
            Create one for Sinhala Repentance, Tamil Worship, or any saved filter.
          </p>
          <Link
            to="/smart-lists/new"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gold-400"
          >
            <Plus className="h-4 w-4" />
            New smart list
          </Link>
        </div>
      )}

      {loadState === 'ready' && lists.length > 0 && (
        <ul className="space-y-3">
          {lists.map((list) => {
            const filter = sanitizeSmartListFilter(list.filter)
            return (
              <li
                key={list.id}
                className="rounded-2xl border border-ink-700/70 bg-ink-800/40 p-4 sm:p-5"
              >
                {renamingId === list.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void handleRename(list.id)
                        }
                        if (event.key === 'Escape') setRenamingId(null)
                      }}
                      disabled={busyId === list.id}
                      className="min-w-0 flex-1 rounded-xl border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-gold-500/50 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      aria-label="Save name"
                      disabled={busyId === list.id}
                      onClick={() => void handleRename(list.id)}
                      className="rounded-lg border border-ink-600 p-2 text-gold-400 hover:bg-ink-700/50 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel"
                      onClick={() => setRenamingId(null)}
                      className="rounded-lg border border-ink-600 p-2 text-ink-400 hover:bg-ink-700/50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/smart-lists/${list.id}`)}
                      className="group flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink-600 bg-ink-900/50 text-gold-400">
                        <Filter className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-xl font-semibold text-ink-100 transition group-hover:text-gold-400">
                          {list.name}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-ink-400">
                          {describeSmartListFilter(filter, tagsById)}
                        </p>
                      </div>
                    </button>
                    <div className="flex shrink-0 gap-1.5">
                      <Link
                        to={`/smart-lists/${list.id}/edit`}
                        aria-label={`Edit filters for ${list.name}`}
                        className="rounded-lg border border-ink-600 p-2 text-ink-400 transition hover:text-gold-400"
                      >
                        <Filter className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        aria-label={`Rename ${list.name}`}
                        disabled={busyId === list.id}
                        onClick={() => {
                          setRenamingId(list.id)
                          setRenameValue(list.name)
                        }}
                        className="rounded-lg border border-ink-600 p-2 text-ink-400 transition hover:text-gold-400 disabled:opacity-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${list.name}`}
                        disabled={busyId === list.id}
                        onClick={() => void handleDelete(list)}
                        className="rounded-lg border border-ink-600 p-2 text-ink-400 transition hover:text-ember-500 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
