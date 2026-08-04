import { useEffect, useState, type DragEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, FilePlus2, Music2, Pencil, Play } from 'lucide-react'
import {
  WorshipHymnPicker,
  type WorshipHymnSelection,
} from './WorshipHymnPicker'
import { WorshipNoteEditor } from './WorshipNoteEditor'
import { WorshipPlanItem, type WorshipPlanRow } from './WorshipPlanItem'
import { useAuth } from '../../context/AuthContext'
import { listChordSheetsByHymn } from '../../services/chordSheetService'
import { getHymn } from '../../services/hymnService'
import {
  addWorshipPlanItem,
  getWorshipPlan,
  listWorshipPlanItems,
  moveOrderedWorshipItem,
  nextWorshipPlanItemOrder,
  removeWorshipPlanItem,
  reorderWorshipPlanItems,
  updateWorshipPlan,
  updateWorshipPlanItem,
} from '../../services/worshipService'
import type { WorshipPlan } from '../../types'

type LoadState = 'loading' | 'ready' | 'error' | 'missing' | 'forbidden'

interface WorshipPlanEditorProps {
  planId: string
}

export function WorshipPlanEditor({ planId }: WorshipPlanEditorProps) {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [plan, setPlan] = useState<WorshipPlan | null>(null)
  const [rows, setRows] = useState<WorshipPlanRow[]>([])

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [reorderBusy, setReorderBusy] = useState(false)
  const [busyItemId, setBusyItemId] = useState<string | null>(null)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [addBusy, setAddBusy] = useState(false)
  const [noteEditorOpen, setNoteEditorOpen] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteBusy, setNoteBusy] = useState(false)

  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [metaBusy, setMetaBusy] = useState(false)

  async function buildRows(
    items: Awaited<ReturnType<typeof listWorshipPlanItems>>,
  ): Promise<WorshipPlanRow[]> {
    const hymnIds = [
      ...new Set(
        items
          .filter((item) => item.type === 'hymn' && item.hymnId)
          .map((item) => item.hymnId!),
      ),
    ]

    const hymns = await Promise.all(hymnIds.map((id) => getHymn(id)))
    const hymnMap = new Map(
      hymnIds.map((id, index) => [id, hymns[index]] as const),
    )

    const sheetLists = await Promise.all(
      hymnIds.map((id) => listChordSheetsByHymn(id)),
    )
    const sheetsByHymn = new Map(
      hymnIds.map((id, index) => [id, sheetLists[index]] as const),
    )

    return items.map((item) => {
      if (item.type !== 'hymn' || !item.hymnId) {
        return { item }
      }
      const sheets = sheetsByHymn.get(item.hymnId) ?? []
      return {
        item,
        hymn: hymnMap.get(item.hymnId) ?? null,
        chordSheets: sheets,
        chordSheet: sheets.find((sheet) => sheet.id === item.chordSheetId) ?? null,
      }
    })
  }

  useEffect(() => {
    if (!planId || !currentUser) {
      setLoadState(!currentUser ? 'forbidden' : 'missing')
      return
    }

    let cancelled = false

    async function load() {
      setLoadState('loading')
      setErrorMessage(null)

      try {
        const userId = currentUser!.uid
        const [planDoc, items] = await Promise.all([
          getWorshipPlan(planId),
          listWorshipPlanItems(planId, userId),
        ])

        if (cancelled) return

        if (!planDoc) {
          setLoadState('missing')
          return
        }

        if (planDoc.userId !== userId) {
          setLoadState('forbidden')
          return
        }

        const nextRows = await buildRows(items)
        if (cancelled) return

        setPlan(planDoc)
        setRows(nextRows)
        setRenameValue(planDoc.name)
        setLoadState('ready')
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load worship plan.')
        setLoadState('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [planId, currentUser])

  function handleDragStart(index: number) {
    return (event: DragEvent) => {
      if (reorderBusy) {
        event.preventDefault()
        return
      }
      setDragIndex(index)
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(index))
    }
  }

  function handleDragOver(index: number) {
    return (event: DragEvent) => {
      if (reorderBusy || dragIndex === null) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      if (overIndex !== index) setOverIndex(index)
    }
  }

  function handleDrop(index: number) {
    return (event: DragEvent) => {
      event.preventDefault()
      if (reorderBusy || dragIndex === null) return
      if (dragIndex !== index) {
        const previous = rows
        const next = moveOrderedWorshipItem(rows, dragIndex, index).map((row, order) => ({
          ...row,
          item: { ...row.item, order },
        }))
        setRows(next)
        setReorderBusy(true)
        void reorderWorshipPlanItems(
          planId,
          next.map((row) => row.item.id),
        )
          .catch(() => setRows(previous))
          .finally(() => setReorderBusy(false))
      }
      setDragIndex(null)
      setOverIndex(null)
    }
  }

  function handleDragEnd() {
    setDragIndex(null)
    setOverIndex(null)
  }

  function handleMove(fromIndex: number, toIndex: number) {
    if (reorderBusy || toIndex < 0 || toIndex >= rows.length || fromIndex === toIndex) return
    const previous = rows
    const next = moveOrderedWorshipItem(rows, fromIndex, toIndex).map((row, order) => ({
      ...row,
      item: { ...row.item, order },
    }))
    setRows(next)
    setReorderBusy(true)
    void reorderWorshipPlanItems(
      planId,
      next.map((row) => row.item.id),
    )
      .catch(() => setRows(previous))
      .finally(() => setReorderBusy(false))
  }

  async function handleAddHymn(selection: WorshipHymnSelection) {
    if (!currentUser || !plan) return
    setAddBusy(true)
    setActionError(null)
    try {
      const items = rows.map((row) => row.item)
      const created = await addWorshipPlanItem({
        planId: plan.id,
        userId: currentUser.uid,
        type: 'hymn',
        hymnId: selection.hymn.id,
        chordSheetId: selection.chordSheetId,
        order: nextWorshipPlanItemOrder(items),
      })
      const sheets = await listChordSheetsByHymn(selection.hymn.id)
      setRows((current) => [
        ...current,
        {
          item: created,
          hymn: selection.hymn,
          chordSheets: sheets,
          chordSheet: sheets.find((sheet) => sheet.id === selection.chordSheetId) ?? null,
        },
      ])
      setPickerOpen(false)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to add hymn.')
    } finally {
      setAddBusy(false)
    }
  }

  async function handleSaveNote(content: string) {
    if (!currentUser || !plan) return
    setNoteBusy(true)
    setActionError(null)
    try {
      if (editingNoteId) {
        const updated = await updateWorshipPlanItem(editingNoteId, { content })
        setRows((current) =>
          current.map((row) =>
            row.item.id === editingNoteId ? { ...row, item: updated } : row,
          ),
        )
      } else {
        const items = rows.map((row) => row.item)
        const created = await addWorshipPlanItem({
          planId: plan.id,
          userId: currentUser.uid,
          type: 'note',
          content,
          order: nextWorshipPlanItemOrder(items),
        })
        setRows((current) => [...current, { item: created }])
      }
      setNoteEditorOpen(false)
      setEditingNoteId(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to save note.')
    } finally {
      setNoteBusy(false)
    }
  }

  async function handleChangeChordSheet(itemId: string, chordSheetId: string) {
    setBusyItemId(itemId)
    setActionError(null)
    const previous = rows
    setRows((current) =>
      current.map((row) => {
        if (row.item.id !== itemId) return row
        const nextId = chordSheetId || undefined
        return {
          ...row,
          item: { ...row.item, chordSheetId: nextId },
          chordSheet: row.chordSheets?.find((sheet) => sheet.id === chordSheetId) ?? null,
        }
      }),
    )
    try {
      await updateWorshipPlanItem(itemId, {
        chordSheetId: chordSheetId || null,
      })
    } catch (error) {
      setRows(previous)
      setActionError(error instanceof Error ? error.message : 'Failed to update chord sheet.')
    } finally {
      setBusyItemId(null)
    }
  }

  async function handleRemove(itemId: string) {
    setBusyItemId(itemId)
    setActionError(null)
    const previous = rows
    const remaining = previous.filter((row) => row.item.id !== itemId)
    setRows(remaining)
    try {
      await removeWorshipPlanItem(itemId)
      if (remaining.length > 0) {
        await reorderWorshipPlanItems(
          planId,
          remaining.map((row) => row.item.id),
        )
        setRows(remaining.map((row, order) => ({
          ...row,
          item: { ...row.item, order },
        })))
      }
    } catch (error) {
      setRows(previous)
      setActionError(error instanceof Error ? error.message : 'Failed to remove item.')
    } finally {
      setBusyItemId(null)
    }
  }

  async function handleRename() {
    if (!plan) return
    const name = renameValue.trim()
    if (!name) return
    setMetaBusy(true)
    setActionError(null)
    try {
      const updated = await updateWorshipPlan(plan.id, { name })
      setPlan(updated)
      setRenaming(false)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to rename plan.')
    } finally {
      setMetaBusy(false)
    }
  }

  const editingNote = editingNoteId
    ? rows.find((row) => row.item.id === editingNoteId)
    : null

  const hymnCount = rows.filter((row) => row.item.type === 'hymn').length
  const noteCount = rows.filter((row) => row.item.type === 'note').length

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link
        to="/worship"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 transition hover:text-gold-400"
      >
        <ArrowLeft className="h-4 w-4" />
        All worship plans
      </Link>

      {loadState === 'loading' && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-700/70 bg-ink-800/30 px-6 py-20">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-gold-400" />
          <p className="text-sm text-ink-400">Loading worship plan…</p>
        </div>
      )}

      {loadState === 'error' && (
        <div className="rounded-2xl border border-ember-500/40 bg-ember-500/10 px-6 py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-ember-500" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink-100">Couldn’t load this plan</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">{errorMessage}</p>
        </div>
      )}

      {(loadState === 'missing' || loadState === 'forbidden') && (
        <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
          <p className="text-sm font-medium text-ink-200">
            {loadState === 'forbidden'
              ? 'You don’t have access to this worship plan.'
              : 'Worship plan not found'}
          </p>
          <Link
            to="/worship"
            className="mt-4 inline-block text-sm text-gold-400 hover:text-gold-400/80"
          >
            Back to Worship plans
          </Link>
        </div>
      )}

      {loadState === 'ready' && plan && (
        <>
          <div className="mb-6 sm:mb-8">
            {renaming ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void handleRename()
                    }
                    if (event.key === 'Escape') {
                      setRenaming(false)
                      setRenameValue(plan.name)
                    }
                  }}
                  disabled={metaBusy}
                  className="min-w-0 flex-1 rounded-xl border border-ink-600 bg-ink-900 px-3 py-2 font-display text-2xl font-semibold text-ink-100 focus:border-gold-500/50 focus:outline-none sm:text-3xl"
                  autoFocus
                />
                <button
                  type="button"
                  disabled={metaBusy || !renameValue.trim()}
                  onClick={() => void handleRename()}
                  className="rounded-xl bg-gold-500 px-3 py-2 text-sm font-medium text-white hover:bg-gold-400 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={metaBusy}
                  onClick={() => {
                    setRenaming(false)
                    setRenameValue(plan.name)
                  }}
                  className="rounded-xl border border-ink-600 px-3 py-2 text-sm text-ink-300 hover:bg-ink-700/50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-start gap-2">
                <h2 className="font-display text-3xl font-semibold text-ink-100 sm:text-4xl">
                  {plan.name}
                </h2>
                <button
                  type="button"
                  aria-label="Rename plan"
                  onClick={() => {
                    setRenaming(true)
                    setRenameValue(plan.name)
                  }}
                  className="mt-2 rounded-lg border border-ink-600 p-2 text-ink-400 transition hover:text-gold-400"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {plan.description?.trim() && (
              <p className="mt-2 text-sm text-ink-300">{plan.description}</p>
            )}
            <p className="mt-2 text-sm text-ink-400">
              {hymnCount} {hymnCount === 1 ? 'hymn' : 'hymns'}
              {noteCount > 0
                ? ` · ${noteCount} ${noteCount === 1 ? 'note' : 'notes'}`
                : ''}
              {' · '}
              private to you
            </p>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={rows.length === 0}
              onClick={() => navigate(`/worship/${plan.id}/mode`)}
              title={
                rows.length === 0
                  ? 'Add at least one item to start Worship Mode'
                  : 'Start distraction-free Worship Mode'
              }
              className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4" fill="currentColor" />
              Start Worship Mode
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-ink-600 px-4 py-2.5 text-sm text-ink-200 transition hover:border-gold-500/40 hover:text-gold-400"
            >
              <Music2 className="h-4 w-4" />
              Add hymn
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingNoteId(null)
                setNoteEditorOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-ink-600 px-4 py-2.5 text-sm text-ink-200 transition hover:border-gold-500/40 hover:text-gold-400"
            >
              <FilePlus2 className="h-4 w-4" />
              Add note
            </button>
          </div>

          {actionError && (
            <p className="mb-4 rounded-xl border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-sm text-ember-500">
              {actionError}
            </p>
          )}

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
              <p className="text-sm text-ink-400">
                This plan is empty. Add hymns and notes to build the order of service.
              </p>
            </div>
          ) : (
            <ul className="space-y-2" aria-label="Worship plan items">
              {rows.map((row, index) => (
                <WorshipPlanItem
                  key={row.item.id}
                  row={row}
                  index={index}
                  total={rows.length}
                  dragIndex={dragIndex}
                  overIndex={overIndex}
                  reorderDisabled={reorderBusy}
                  busy={busyItemId === row.item.id}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  onMove={handleMove}
                  onEditNote={
                    row.item.type === 'note'
                      ? () => {
                          setEditingNoteId(row.item.id)
                          setNoteEditorOpen(true)
                        }
                      : undefined
                  }
                  onChangeChordSheet={
                    row.item.type === 'hymn'
                      ? (chordSheetId) => void handleChangeChordSheet(row.item.id, chordSheetId)
                      : undefined
                  }
                  onRemove={() => void handleRemove(row.item.id)}
                />
              ))}
            </ul>
          )}

          <WorshipHymnPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            busy={addBusy}
            onSelect={handleAddHymn}
          />

          <WorshipNoteEditor
            open={noteEditorOpen}
            initialContent={editingNote?.item.content ?? ''}
            title={editingNoteId ? 'Edit note' : 'Add note'}
            submitLabel={editingNoteId ? 'Save note' : 'Add note'}
            busy={noteBusy}
            onClose={() => {
              if (noteBusy) return
              setNoteEditorOpen(false)
              setEditingNoteId(null)
            }}
            onSave={handleSaveNote}
          />
        </>
      )}
    </div>
  )
}
