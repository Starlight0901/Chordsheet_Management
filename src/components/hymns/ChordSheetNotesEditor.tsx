import { useEffect, useState } from 'react'
import { getChordSheetNote, upsertChordSheetNote } from '../../services/notesService'
import { useToast } from '../../context/ToastContext'
import { cn } from '../../utils/cn'

interface ChordSheetNotesEditorProps {
  userId: string
  chordSheetId: string
  className?: string
}

export function ChordSheetNotesEditor({
  userId,
  chordSheetId,
  className,
}: ChordSheetNotesEditorProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [savedContent, setSavedContent] = useState('')
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      // Don't hit Firestore without a real authenticated uid.
      if (!userId.trim() || !chordSheetId.trim()) {
        setLoading(false)
        setSavedContent('')
        setDraft('')
        setError(null)
        setEditing(false)
        return
      }

      setLoading(true)
      setError(null)
      setEditing(false)

      try {
        const note = await getChordSheetNote(userId, chordSheetId)
        if (cancelled) return
        // Missing note is a normal empty state — not an error.
        const content = note?.content ?? ''
        setSavedContent(content)
        setDraft(content)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setSavedContent('')
        setDraft('')
        setError(err instanceof Error ? err.message : 'Failed to load notes.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [userId, chordSheetId])

  async function handleSave() {
    if (!userId.trim() || !chordSheetId.trim()) return

    setSaving(true)
    setError(null)
    try {
      const note = await upsertChordSheetNote(userId, chordSheetId, draft)
      setSavedContent(note.content)
      setDraft(note.content)
      setEditing(false)
      toast.success('Note saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note.')
      toast.error('Could not save note')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(savedContent)
    setEditing(false)
    setError(null)
  }

  const isDirty = draft !== savedContent

  return (
    <section
      className={cn(
        'rounded-2xl border border-ink-700/70 bg-ink-800/40 p-4 sm:p-5',
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-ink-100">Personal notes</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            Only you can see these notes. Free-form — tempo, capo, cues, anything.
          </p>
        </div>
        {!editing && !loading && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex min-h-10 shrink-0 items-center rounded-xl border border-ink-600 px-3 text-sm text-ink-300 transition hover:border-gold-500/40 hover:text-gold-400"
          >
            {savedContent.trim() ? 'Edit' : 'Add note'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-ink-500">Loading notes…</p>
      ) : editing ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={8}
            disabled={saving}
            placeholder={`Tempo: 72\nBeat: D D-U U-D-U\n4/4\nStart softly…`}
            className="w-full resize-y rounded-xl border border-ink-600 bg-ink-900/60 px-3.5 py-3 font-sans text-base leading-relaxed text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30 disabled:opacity-60 sm:text-sm"
          />
          {error && <p className="text-xs text-ember-500">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="min-h-11 w-full rounded-xl border border-ink-600 px-4 py-2.5 text-sm text-ink-300 transition hover:bg-ink-700/50 disabled:opacity-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !isDirty}
              className="min-h-11 w-full rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gold-400 disabled:opacity-50 sm:w-auto"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {savedContent.trim() ? (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-200">
              {savedContent}
            </pre>
          ) : (
            <p className="text-sm text-ink-500">No personal notes for this sheet yet.</p>
          )}
          {error && <p className="mt-2 text-xs text-ember-500">{error}</p>}
        </div>
      )}
    </section>
  )
}
