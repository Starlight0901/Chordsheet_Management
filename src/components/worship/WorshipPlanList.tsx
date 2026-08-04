import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CalendarHeart,
  Check,
  Copy,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  createWorshipPlan,
  deleteWorshipPlan,
  duplicateWorshipPlan,
  listAllUserWorshipPlanItems,
  listWorshipPlans,
  updateWorshipPlan,
} from '../../services/worshipService'
import type { WorshipPlan } from '../../types'
import { cn } from '../../utils/cn'

type LoadState = 'loading' | 'ready' | 'error'

export function WorshipPlanList() {
  const { currentUser } = useAuth()
  const [plans, setPlans] = useState<WorshipPlan[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [editingDescId, setEditingDescId] = useState<string | null>(null)
  const [descValue, setDescValue] = useState('')

  async function loadPlans(userId: string) {
    const [userPlans, items] = await Promise.all([
      listWorshipPlans(userId),
      listAllUserWorshipPlanItems(userId),
    ])
    const nextCounts: Record<string, number> = {}
    for (const item of items) {
      nextCounts[item.planId] = (nextCounts[item.planId] ?? 0) + 1
    }
    setPlans(userPlans)
    setCounts(nextCounts)
  }

  useEffect(() => {
    if (!currentUser) {
      setPlans([])
      setLoadState('ready')
      return
    }

    let cancelled = false

    async function load() {
      setLoadState('loading')
      setErrorMessage(null)
      try {
        await loadPlans(currentUser!.uid)
        if (!cancelled) setLoadState('ready')
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load worship plans.')
        setLoadState('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [currentUser])

  const totalItems = useMemo(
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
      await createWorshipPlan({
        userId: currentUser.uid,
        name,
        description: newDescription.trim() || undefined,
      })
      setNewName('')
      setNewDescription('')
      await loadPlans(currentUser.uid)
      setLoadState('ready')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create worship plan.')
    } finally {
      setCreating(false)
    }
  }

  async function handleRename(planId: string) {
    if (!currentUser) return
    const name = renameValue.trim()
    if (!name) return

    setBusyId(planId)
    setErrorMessage(null)
    try {
      await updateWorshipPlan(planId, { name })
      setRenamingId(null)
      await loadPlans(currentUser.uid)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to rename plan.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleSaveDescription(planId: string) {
    if (!currentUser) return
    setBusyId(planId)
    setErrorMessage(null)
    try {
      const trimmed = descValue.trim()
      await updateWorshipPlan(planId, { description: trimmed || null })
      setEditingDescId(null)
      await loadPlans(currentUser.uid)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update description.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDuplicate(plan: WorshipPlan) {
    if (!currentUser) return
    setBusyId(plan.id)
    setErrorMessage(null)
    try {
      await duplicateWorshipPlan(plan.id, currentUser.uid)
      await loadPlans(currentUser.uid)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to duplicate plan.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(plan: WorshipPlan) {
    if (!currentUser) return
    const ok = window.confirm(
      `Delete worship plan “${plan.name}”? Hymns stay in the library.`,
    )
    if (!ok) return

    setBusyId(plan.id)
    setErrorMessage(null)
    try {
      await deleteWorshipPlan(plan.id)
      await loadPlans(currentUser.uid)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete plan.')
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
        <h2 className="font-display text-3xl font-semibold text-ink-100 sm:text-4xl">
          Worship plans
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300 sm:text-base">
          Private sequences for services, programs, rehearsals, and other ordered music —
          hymns and notes, in the order you need them.
        </p>
      </div>

      <form
        onSubmit={(event) => void handleCreate(event)}
        className="mb-6 space-y-3 rounded-2xl border border-ink-700/70 bg-ink-800/40 p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="new-worship-plan"
              className="mb-2 block text-xs font-medium tracking-wide text-ink-400 uppercase"
            >
              New worship plan
            </label>
            <input
              id="new-worship-plan"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              disabled={creating}
              placeholder="e.g. Sunday 10am, Christmas Eve, Band rehearsal"
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
        </div>
        <div>
          <label
            htmlFor="new-worship-plan-desc"
            className="mb-2 block text-xs font-medium tracking-wide text-ink-400 uppercase"
          >
            Description <span className="normal-case text-ink-500">(optional)</span>
          </label>
          <input
            id="new-worship-plan-desc"
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            disabled={creating}
            placeholder="Short note about this plan"
            className="w-full rounded-xl border border-ink-600 bg-ink-900/50 px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          />
        </div>
      </form>

      {errorMessage && loadState !== 'error' && (
        <p className="mb-4 rounded-xl border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-sm text-ember-500">
          {errorMessage}
        </p>
      )}

      {loadState === 'loading' && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-700/70 bg-ink-800/30 px-6 py-20">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-gold-400" />
          <p className="text-sm text-ink-400">Loading worship plans…</p>
        </div>
      )}

      {loadState === 'error' && (
        <div className="rounded-2xl border border-ember-500/40 bg-ember-500/10 px-6 py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-ember-500" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink-100">Couldn’t load worship plans</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">{errorMessage}</p>
        </div>
      )}

      {loadState === 'ready' && plans.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
          <CalendarHeart className="mx-auto mb-3 h-8 w-8 text-ink-500" strokeWidth={1.5} />
          <p className="text-sm text-ink-400">No worship plans yet. Create one above.</p>
        </div>
      )}

      {loadState === 'ready' && plans.length > 0 && (
        <>
          <p className="mb-3 text-xs text-ink-500">
            {plans.length} {plans.length === 1 ? 'plan' : 'plans'}
            {totalItems > 0 ? ` · ${totalItems} items` : ''}
            {' · '}
            private to you
          </p>
          <ul className="grid gap-3 lg:grid-cols-2">
            {plans.map((plan) => {
              const itemCount = counts[plan.id] ?? 0
              const countLabel = itemCount === 1 ? '1 item' : `${itemCount} items`
              const busy = busyId === plan.id

              return (
                <li key={plan.id}>
                  <article className="rounded-2xl border border-ink-700/70 bg-ink-800/40 p-4 transition hover:border-gold-500/30 sm:p-5">
                    {renamingId === plan.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              void handleRename(plan.id)
                            }
                            if (event.key === 'Escape') setRenamingId(null)
                          }}
                          disabled={busy}
                          className="min-w-0 flex-1 rounded-xl border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-gold-500/50 focus:outline-none"
                          autoFocus
                          aria-label="Plan name"
                        />
                        <button
                          type="button"
                          aria-label="Save name"
                          disabled={busy}
                          onClick={() => void handleRename(plan.id)}
                          className="rounded-lg border border-ink-600 p-2 text-gold-400 hover:bg-ink-700/50 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Cancel rename"
                          disabled={busy}
                          onClick={() => setRenamingId(null)}
                          className="rounded-lg border border-ink-600 p-2 text-ink-400 hover:bg-ink-700/50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <Link
                          to={`/worship/${plan.id}`}
                          className="group flex min-w-0 flex-1 items-start gap-3"
                          aria-label={`Open ${plan.name}`}
                        >
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink-600 bg-ink-900/50 text-gold-400">
                            <CalendarHeart className="h-4 w-4" strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-display text-xl font-semibold text-ink-100 transition group-hover:text-gold-400">
                              {plan.name}
                            </h3>
                            <p className="mt-1 text-xs text-ink-400">{countLabel}</p>
                          </div>
                        </Link>

                        <div className="flex shrink-0 gap-1.5">
                          <button
                            type="button"
                            aria-label={`Rename ${plan.name}`}
                            disabled={busy}
                            onClick={() => {
                              setRenamingId(plan.id)
                              setRenameValue(plan.name)
                              setEditingDescId(null)
                            }}
                            className="rounded-lg border border-ink-600 p-2 text-ink-400 transition hover:text-gold-400 disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Duplicate ${plan.name}`}
                            disabled={busy}
                            onClick={() => void handleDuplicate(plan)}
                            className="rounded-lg border border-ink-600 p-2 text-ink-400 transition hover:text-gold-400 disabled:opacity-50"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${plan.name}`}
                            disabled={busy}
                            onClick={() => void handleDelete(plan)}
                            className={cn(
                              'rounded-lg border border-ink-600 p-2 text-ink-400 transition',
                              'hover:border-ember-500/40 hover:text-ember-500 disabled:opacity-50',
                            )}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {editingDescId === plan.id ? (
                      <div className="mt-3 flex items-start gap-2">
                        <textarea
                          value={descValue}
                          onChange={(event) => setDescValue(event.target.value)}
                          disabled={busy}
                          rows={2}
                          placeholder="Add a description…"
                          className="min-w-0 flex-1 resize-y rounded-xl border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-gold-500/50 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          aria-label="Save description"
                          disabled={busy}
                          onClick={() => void handleSaveDescription(plan.id)}
                          className="rounded-lg border border-ink-600 p-2 text-gold-400 hover:bg-ink-700/50 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Cancel description edit"
                          disabled={busy}
                          onClick={() => setEditingDescId(null)}
                          className="rounded-lg border border-ink-600 p-2 text-ink-400 hover:bg-ink-700/50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || renamingId === plan.id}
                        onClick={() => {
                          setEditingDescId(plan.id)
                          setDescValue(plan.description ?? '')
                          setRenamingId(null)
                        }}
                        className="mt-3 w-full rounded-xl border border-dashed border-ink-700 px-3 py-2 text-left text-xs text-ink-500 transition hover:border-ink-600 hover:text-ink-300 disabled:opacity-50"
                      >
                        {plan.description?.trim()
                          ? plan.description
                          : 'Add description…'}
                      </button>
                    )}
                  </article>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
