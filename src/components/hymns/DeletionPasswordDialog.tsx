import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'

interface DeletionPasswordDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  busy?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: (deletionPassword: string) => void
}

/** Shared confirmation + app deletion-password dialog (not Google password). */
export function DeletionPasswordDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  busy,
  error,
  onCancel,
  onConfirm,
}: DeletionPasswordDialogProps) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!open) return
    setPassword('')
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink-950/70"
        disabled={busy}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="safe-area-pb relative z-10 w-full max-w-md rounded-t-2xl border border-ink-700 bg-ink-850 p-5 shadow-xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-xl font-semibold text-ink-100">
              {title}
            </h2>
            <p className="mt-1 text-sm text-ink-400">{description}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="touch-target shrink-0 rounded-xl border border-ink-600 text-ink-400 transition hover:bg-ink-700/60 hover:text-ink-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault()
            onConfirm(password)
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="deletion-password" className="mb-2 block text-sm font-medium text-ink-200">
              Deletion password
            </label>
            <p className="mb-2 text-xs text-ink-500">
              App confirmation password only — not your Google password, and not a true security
              boundary (it ships in the frontend bundle).
            </p>
            <input
              ref={inputRef}
              id="deletion-password"
              type="password"
              autoComplete="off"
              inputMode="text"
              enterKeyHint="done"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              className="w-full rounded-xl border border-ink-600 bg-ink-900/60 px-3.5 py-3 text-base text-ink-100 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30 disabled:opacity-60 sm:text-sm"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-ember-500/40 bg-ember-500/10 px-3.5 py-3 text-sm text-ember-500">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="min-h-11 w-full rounded-xl border border-ink-600 px-4 py-2.5 text-sm text-ink-300 transition hover:bg-ink-700/50 disabled:opacity-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !password.trim()}
              className="min-h-11 w-full rounded-xl bg-ember-500 px-4 py-2.5 text-sm font-medium text-ink-100 transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
            >
              {busy ? 'Deleting…' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
