import { useEffect, useId, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import {
  addWorshipPlanItem,
  createWorshipPlan,
  listWorshipPlanItems,
  listWorshipPlans,
  nextWorshipPlanItemOrder,
} from '../../services/worshipService'
import type { WorshipPlan } from '../../types'

interface AddToWorshipPlanDialogProps {
  open: boolean
  userId: string
  hymnId: string
  chordSheetId?: string
  hymnName: string
  onClose: () => void
}

export function AddToWorshipPlanDialog({
  open,
  userId,
  hymnId,
  chordSheetId,
  hymnName,
  onClose,
}: AddToWorshipPlanDialogProps) {
  const titleId = useId()
  const [plans, setPlans] = useState<WorshipPlan[]>([])
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
        const data = await listWorshipPlans(userId)
        if (!cancelled) setPlans(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load plans.')
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

  async function addToPlan(plan: WorshipPlan) {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const items = await listWorshipPlanItems(plan.id, userId)
      await addWorshipPlanItem({
        planId: plan.id,
        userId,
        type: 'hymn',
        hymnId,
        chordSheetId,
        order: nextWorshipPlanItemOrder(items),
      })
      setSuccess(`Added to “${plan.name}”.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to worship plan.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    const name = newName.trim()
    if (!name) {
      setError('Plan name is required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const plan = await createWorshipPlan({ userId, name })
      await addWorshipPlanItem({
        planId: plan.id,
        userId,
        type: 'hymn',
        hymnId,
        chordSheetId,
        order: 0,
      })
      setPlans((current) => [plan, ...current])
      setNewName('')
      setSuccess(`Created “${plan.name}” and added the hymn.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create worship plan.')
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
              Add to worship plan
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              Add <span className="text-ink-200">{hymnName}</span> to a personal worship plan.
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
          <p className="text-sm text-ink-500">Loading plans…</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {plans.length === 0 && (
              <li className="rounded-xl border border-dashed border-ink-600 px-3 py-4 text-center text-sm text-ink-500">
                No worship plans yet. Create one below.
              </li>
            )}
            {plans.map((plan) => (
              <li key={plan.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void addToPlan(plan)}
                  className="flex min-h-12 w-full items-center justify-between rounded-xl border border-ink-600 bg-ink-900/40 px-3.5 py-3 text-left text-sm text-ink-200 transition hover:border-gold-500/40 hover:text-gold-400 disabled:opacity-50"
                >
                  <span>{plan.name}</span>
                  <span className="text-xs text-ink-500">Add</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleCreate} className="space-y-3 border-t border-ink-700/60 pt-4">
          <label htmlFor="new-plan-name" className="block text-xs font-medium tracking-wide text-ink-400 uppercase">
            New plan
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="new-plan-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              disabled={busy}
              placeholder="Plan name"
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
