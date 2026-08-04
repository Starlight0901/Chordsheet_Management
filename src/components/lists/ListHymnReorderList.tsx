import { useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, GripVertical, Music2, Trash2 } from 'lucide-react'
import { TaxonomyBadges } from '../taxonomy'
import type { Hymn } from '../../types'
import { cn } from '../../utils/cn'

export interface ListHymnRow {
  itemId: string
  hymn: Hymn
  order: number
}

interface ListHymnReorderListProps {
  rows: ListHymnRow[]
  onReorder: (next: ListHymnRow[]) => void
  onRemove: (itemId: string) => void
  reorderDisabled?: boolean
  removeBusyId?: string | null
}

function moveRow(rows: ListHymnRow[], fromIndex: number, toIndex: number): ListHymnRow[] {
  if (toIndex < 0 || toIndex >= rows.length || fromIndex === toIndex) return [...rows]
  const next = [...rows]
  const [removed] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, removed)
  return next
}

export function ListHymnReorderList({
  rows,
  onReorder,
  onRemove,
  reorderDisabled,
  removeBusyId,
}: ListHymnReorderListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  function handleDragStart(index: number) {
    return (event: DragEvent) => {
      if (reorderDisabled) {
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
      if (reorderDisabled || dragIndex === null) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      if (overIndex !== index) setOverIndex(index)
    }
  }

  function handleDrop(index: number) {
    return (event: DragEvent) => {
      event.preventDefault()
      if (reorderDisabled || dragIndex === null) return
      if (dragIndex !== index) {
        onReorder(moveRow(rows, dragIndex, index))
      }
      setDragIndex(null)
      setOverIndex(null)
    }
  }

  function handleDragEnd() {
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <ul className="space-y-2" aria-label="List hymns">
      {rows.map((row, index) => (
        <li
          key={row.itemId}
          onDragOver={handleDragOver(index)}
          onDrop={handleDrop(index)}
          className={cn(
            'rounded-2xl border bg-ink-800/40 transition',
            overIndex === index && dragIndex !== index
              ? 'border-gold-500/50'
              : 'border-ink-700/70',
            dragIndex === index && 'opacity-60',
          )}
        >
          <div className="flex items-stretch gap-1 p-2 sm:gap-2 sm:p-3">
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                aria-label={`Move ${row.hymn.name} up`}
                disabled={reorderDisabled || index === 0}
                onClick={() => onReorder(moveRow(rows, index, index - 1))}
                className="touch-target rounded-xl border border-ink-600 text-ink-400 transition hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Drag to reorder ${row.hymn.name}`}
                draggable={!reorderDisabled}
                onDragStart={handleDragStart(index)}
                onDragEnd={handleDragEnd}
                disabled={reorderDisabled}
                className={cn(
                  'hidden min-h-11 min-w-11 cursor-grab items-center justify-center rounded-xl border border-ink-600 text-ink-500 active:cursor-grabbing sm:flex',
                  reorderDisabled && 'cursor-not-allowed opacity-40',
                )}
              >
                <GripVertical className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label={`Move ${row.hymn.name} down`}
                disabled={reorderDisabled || index >= rows.length - 1}
                onClick={() => onReorder(moveRow(rows, index, index + 1))}
                className="touch-target rounded-xl border border-ink-600 text-ink-400 transition hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <Link
              to={`/hymns/${row.hymn.id}`}
              className="group flex min-w-0 flex-1 items-start gap-3 rounded-xl px-1 py-1 transition hover:bg-ink-900/40"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-600 bg-ink-900/50 text-gold-400">
                <Music2 className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold text-ink-100 transition group-hover:text-gold-400">
                  {row.hymn.name}
                </p>
                <TaxonomyBadges
                  languages={row.hymn.languages}
                  categories={row.hymn.categories}
                  className="mt-2"
                />
              </div>
            </Link>

            <button
              type="button"
              aria-label={`Remove ${row.hymn.name} from list`}
              disabled={removeBusyId === row.itemId}
              onClick={() => onRemove(row.itemId)}
              className="touch-target shrink-0 self-start rounded-xl border border-ink-600 text-ink-400 transition hover:border-ember-500/40 hover:text-ember-500 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
