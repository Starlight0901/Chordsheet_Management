import { type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, FileText, GripVertical, Music2, Pencil, Trash2 } from 'lucide-react'
import type { ChordSheet, Hymn, WorshipPlanItem as WorshipPlanItemType } from '../../types'
import { cn } from '../../utils/cn'

export interface WorshipPlanRow {
  item: WorshipPlanItemType
  hymn?: Hymn | null
  chordSheet?: ChordSheet | null
  chordSheets?: ChordSheet[]
}

interface WorshipPlanItemProps {
  row: WorshipPlanRow
  index: number
  total: number
  dragIndex: number | null
  overIndex: number | null
  reorderDisabled?: boolean
  busy?: boolean
  onDragStart: (index: number) => (event: DragEvent) => void
  onDragOver: (index: number) => (event: DragEvent) => void
  onDrop: (index: number) => (event: DragEvent) => void
  onDragEnd: () => void
  onMove: (fromIndex: number, toIndex: number) => void
  onEditNote?: () => void
  onChangeChordSheet?: (chordSheetId: string) => void
  onRemove: () => void
}

export function WorshipPlanItem({
  row,
  index,
  total,
  dragIndex,
  overIndex,
  reorderDisabled,
  busy,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMove,
  onEditNote,
  onChangeChordSheet,
  onRemove,
}: WorshipPlanItemProps) {
  const isNote = row.item.type === 'note'
  const label = isNote
    ? row.item.content?.trim() || 'Empty note'
    : row.hymn?.name ?? 'Unknown hymn'

  return (
    <li
      onDragOver={onDragOver(index)}
      onDrop={onDrop(index)}
      className={cn(
        'rounded-2xl border transition',
        isNote ? 'brand-surface-muted border-gold-500/20' : 'border-ink-700 bg-ink-800',
        overIndex === index && dragIndex !== index ? 'border-gold-500/50' : null,
        dragIndex === index && 'opacity-60',
      )}
    >
      <div className="flex items-stretch gap-1 p-2 sm:gap-2 sm:p-3">
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            aria-label={`Move ${label} up`}
            disabled={reorderDisabled || busy || index === 0}
            onClick={() => onMove(index, index - 1)}
            className="touch-target rounded-xl border border-ink-600 text-ink-400 transition hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Drag to reorder ${label}`}
            draggable={!reorderDisabled}
            onDragStart={onDragStart(index)}
            onDragEnd={onDragEnd}
            disabled={reorderDisabled || busy}
            className={cn(
              'hidden min-h-11 min-w-11 cursor-grab items-center justify-center rounded-xl border border-ink-600 text-ink-500 active:cursor-grabbing sm:flex',
              (reorderDisabled || busy) && 'cursor-not-allowed opacity-40',
            )}
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={`Move ${label} down`}
            disabled={reorderDisabled || busy || index >= total - 1}
            onClick={() => onMove(index, index + 1)}
            className="touch-target rounded-xl border border-ink-600 text-ink-400 transition hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          {isNote ? (
            <div className="flex items-start gap-3 rounded-xl px-1 py-1">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-600 bg-ink-900/50 text-ink-300">
                <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-wide text-ink-500 uppercase">Note</p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-200">
                  {row.item.content}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl px-1 py-1 sm:flex-row sm:items-start">
              <Link
                to={row.hymn ? `/hymns/${row.hymn.id}` : '#'}
                className="group flex min-w-0 flex-1 items-start gap-3 transition hover:bg-ink-900/40"
                onClick={(event) => {
                  if (!row.hymn) event.preventDefault()
                }}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-600 bg-ink-900/50 text-gold-400">
                  <Music2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium tracking-wide text-ink-500 uppercase">Hymn</p>
                  <p className="font-display text-lg font-semibold text-ink-100 transition group-hover:text-gold-400">
                    {row.hymn?.name ?? 'Hymn unavailable'}
                  </p>
                </div>
              </Link>

              {row.chordSheets && row.chordSheets.length > 0 && onChangeChordSheet && (
                <div className="sm:w-48 sm:shrink-0">
                  <label
                    htmlFor={`chord-sheet-${row.item.id}`}
                    className="mb-1 block text-[10px] font-medium tracking-wide text-ink-500 uppercase"
                  >
                    Chord sheet
                  </label>
                  <select
                    id={`chord-sheet-${row.item.id}`}
                    value={row.item.chordSheetId ?? ''}
                    disabled={busy}
                    onChange={(event) => onChangeChordSheet(event.target.value)}
                    className="w-full rounded-lg border border-ink-600 bg-ink-900/50 px-2.5 py-2.5 text-base text-ink-200 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30 disabled:opacity-50 sm:py-1.5 sm:text-xs"
                  >
                    <option value="">None selected</option>
                    {row.chordSheets.map((sheet, sheetIndex) => (
                      <option key={sheet.id} value={sheet.id}>
                        {sheet.originalFileName || `Sheet ${sheetIndex + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1.5 self-start">
          {isNote && onEditNote && (
            <button
              type="button"
              aria-label="Edit note"
              disabled={busy}
              onClick={onEditNote}
              className="touch-target rounded-xl border border-ink-600 text-ink-400 transition hover:text-gold-400 disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            aria-label={isNote ? 'Delete note' : `Remove ${label}`}
            disabled={busy}
            onClick={onRemove}
            className="touch-target rounded-xl border border-ink-600 text-ink-400 transition hover:border-ember-500/40 hover:text-ember-500 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  )
}
