import { GripVertical, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import type { DragEvent } from 'react'
import type { ChordSheetFormItem } from './chordSheetFormTypes'
import { getDisplayName, getPreviewSrc } from './chordSheetFormTypes'
import { cn } from '../../utils/cn'

interface ChordSheetPreviewProps {
  item: ChordSheetFormItem
  index: number
  disabled?: boolean
  onRemove: (id: string) => void
  onRetry?: (id: string) => void
  dragHandleProps?: {
    draggable?: boolean
    onDragStart?: (event: DragEvent) => void
    onDragEnd?: (event: DragEvent) => void
  }
  isDragging?: boolean
  isDropTarget?: boolean
}

export function ChordSheetPreview({
  item,
  index,
  disabled,
  onRemove,
  onRetry,
  dragHandleProps,
  isDragging,
  isDropTarget,
}: ChordSheetPreviewProps) {
  const name = getDisplayName(item)
  const src = getPreviewSrc(item)
  const isUploading = item.kind === 'new' && item.status === 'uploading'
  const isError = item.kind === 'new' && item.status === 'error'
  const progress = item.kind === 'new' ? item.progress : 100

  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border bg-ink-900/40 p-3 transition',
        isDragging && 'opacity-50',
        isDropTarget ? 'border-gold-500/60 bg-gold-500/5' : 'border-ink-700/70',
        isError && 'border-ember-500/40',
      )}
    >
      <button
        type="button"
        aria-label={`Drag to reorder sheet ${index + 1}`}
        disabled={disabled}
        className="mt-1 flex min-h-11 min-w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-ink-500 hover:text-ink-300 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
        {...dragHandleProps}
      >
        <GripVertical className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-ink-600 bg-ink-800">
        <img src={src} alt="" className="h-full w-full object-cover" />
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/60">
            <Loader2 className="h-5 w-5 animate-spin text-gold-400" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-100">{name}</p>
            <p className="mt-0.5 text-xs text-ink-500">Sheet {index + 1}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isError && onRetry && (
              <button
                type="button"
                onClick={() => onRetry(item.id)}
                disabled={disabled}
                className="touch-target rounded-xl border border-ink-600 text-ink-300 transition hover:border-gold-500/40 hover:text-gold-400 disabled:opacity-50"
                aria-label={`Retry upload for ${name}`}
                title="Retry upload"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={disabled || isUploading}
              className="touch-target rounded-xl border border-ink-600 text-ink-400 transition hover:border-ember-500/40 hover:text-ember-500 disabled:opacity-50"
              aria-label={`Remove ${name}`}
              title="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {item.kind === 'new' && item.status === 'uploading' && (
          <div className="mt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
              <div
                className="h-full rounded-full bg-gold-500 transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-500">Uploading… {progress}%</p>
          </div>
        )}

        {item.kind === 'new' && item.status === 'uploaded' && (
          <p className="mt-2 text-[11px] text-gold-400">Uploaded to Cloudinary</p>
        )}

        {isError && item.kind === 'new' && (
          <p className="mt-2 text-xs text-ember-500">{item.error ?? 'Upload failed.'}</p>
        )}

        {item.kind === 'existing' && (
          <p className="mt-2 text-[11px] text-ink-500">Saved chord sheet</p>
        )}
      </div>
    </div>
  )
}
