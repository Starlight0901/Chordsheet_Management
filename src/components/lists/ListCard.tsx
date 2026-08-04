import { Link } from 'react-router-dom'
import { Check, ListMusic, Pencil, Trash2, X } from 'lucide-react'
import type { UserList } from '../../types'
import { cn } from '../../utils/cn'

interface ListCardProps {
  list: UserList
  hymnCount: number
  renaming: boolean
  renameValue: string
  busy?: boolean
  onRenameValueChange: (value: string) => void
  onStartRename: () => void
  onCancelRename: () => void
  onConfirmRename: () => void
  onDelete: () => void
}

export function ListCard({
  list,
  hymnCount,
  renaming,
  renameValue,
  busy,
  onRenameValueChange,
  onStartRename,
  onCancelRename,
  onConfirmRename,
  onDelete,
}: ListCardProps) {
  const countLabel = hymnCount === 1 ? '1 hymn' : `${hymnCount} hymns`
  const isSystem = list.type === 'system'

  return (
    <article className="rounded-2xl border border-ink-700/70 bg-ink-800/40 p-4 transition hover:border-gold-500/30 sm:p-5">
      {renaming ? (
        <div className="flex items-center gap-2">
          <input
            value={renameValue}
            onChange={(event) => onRenameValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onConfirmRename()
              }
              if (event.key === 'Escape') onCancelRename()
            }}
            disabled={busy}
            className="min-w-0 flex-1 rounded-xl border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-gold-500/50 focus:outline-none"
            autoFocus
            aria-label="List name"
          />
          <button
            type="button"
            aria-label="Save name"
            disabled={busy}
            onClick={onConfirmRename}
            className="rounded-lg border border-ink-600 p-2 text-gold-400 hover:bg-ink-700/50 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Cancel rename"
            disabled={busy}
            onClick={onCancelRename}
            className="rounded-lg border border-ink-600 p-2 text-ink-400 hover:bg-ink-700/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <Link
            to={`/lists/${list.id}`}
            className="group flex min-w-0 flex-1 items-start gap-3"
            aria-label={`Open ${list.name}`}
          >
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink-600 bg-ink-900/50 text-gold-400">
              <ListMusic className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-xl font-semibold text-ink-100 transition group-hover:text-gold-400">
                  {list.name}
                </h3>
                {isSystem && (
                  <span className="rounded-full border border-ink-600 px-2 py-0.5 text-[10px] tracking-wide text-ink-400 uppercase">
                    System
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-400">{countLabel}</p>
            </div>
          </Link>

          <div className="flex shrink-0 gap-1.5">
            {!isSystem && (
              <button
                type="button"
                aria-label={`Rename ${list.name}`}
                disabled={busy}
                onClick={onStartRename}
                className="touch-target rounded-xl border border-ink-600 text-ink-400 transition hover:text-gold-400 disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              aria-label={isSystem ? 'System lists cannot be deleted' : `Delete ${list.name}`}
              disabled={busy || isSystem}
              onClick={onDelete}
              title={isSystem ? 'System lists cannot be deleted' : undefined}
              className={cn(
                'touch-target rounded-xl border border-ink-600 transition disabled:cursor-not-allowed disabled:opacity-40',
                isSystem
                  ? 'text-ink-600'
                  : 'text-ink-400 hover:border-ember-500/40 hover:text-ember-500',
              )}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
