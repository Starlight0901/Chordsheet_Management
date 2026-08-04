import { useId, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
}

/** Accessible confirmation dialog for destructive / important actions. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
        onClick={() => {
          if (!busy) onCancel()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="safe-area-pb relative z-10 w-full max-w-md rounded-t-2xl border border-ink-700 bg-ink-850 p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-xl font-semibold text-ink-100">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-ink-400">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={busy}
            onClick={onCancel}
            className="touch-target shrink-0 rounded-xl border border-ink-600 text-ink-400 transition hover:bg-ink-700/60 hover:text-ink-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-11 w-full rounded-xl border border-ink-600 px-4 py-2.5 text-sm text-ink-300 transition hover:bg-ink-700/50 disabled:opacity-50 sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cn(
              'min-h-11 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 sm:w-auto',
              tone === 'danger'
                ? 'bg-ember-500 text-white hover:brightness-110'
                : 'bg-gold-500 text-white hover:bg-gold-400',
            )}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
