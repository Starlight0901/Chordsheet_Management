import { useEffect, useId, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'

interface WorshipNoteEditorProps {
  open: boolean
  initialContent?: string
  title?: string
  submitLabel?: string
  busy?: boolean
  onClose: () => void
  onSave: (content: string) => void | Promise<void>
}

export function WorshipNoteEditor({
  open,
  initialContent = '',
  title = 'Add note',
  submitLabel = 'Save note',
  busy,
  onClose,
  onSave,
}: WorshipNoteEditorProps) {
  const titleId = useId()
  const [content, setContent] = useState(initialContent)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setContent(initialContent)
    setError(null)
  }, [open, initialContent])

  if (!open) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) {
      setError('Note content is required.')
      return
    }
    setError(null)
    await onSave(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-ink-950/70"
        onClick={onClose}
        disabled={busy}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-ink-700 bg-ink-850 p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-xl font-semibold text-ink-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-ink-600 p-2 text-ink-400 transition hover:bg-ink-700/60 hover:text-ink-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label
              htmlFor="worship-note-content"
              className="mb-2 block text-xs font-medium tracking-wide text-ink-400 uppercase"
            >
              Note
            </label>
            <textarea
              id="worship-note-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={busy}
              rows={4}
              placeholder="e.g. Short prayer, ask congregation to stand…"
              className="w-full resize-y rounded-xl border border-ink-600 bg-ink-900/50 px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
              autoFocus
            />
          </div>

          {error && (
            <p className="rounded-xl border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-sm text-ember-500">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-xl border border-ink-600 px-4 py-2.5 text-sm text-ink-300 transition hover:bg-ink-700/50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !content.trim()}
              className="rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gold-400 disabled:opacity-50"
            >
              {busy ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
