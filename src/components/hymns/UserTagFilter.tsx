import { cn } from '../../utils/cn'
import type { UserTag } from '../../types'

interface UserTagFilterProps {
  tags: readonly UserTag[]
  value: readonly string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  className?: string
}

/**
 * Filter hymns by the signed-in user's private tags (AND).
 * Kept separate from global CategoryFilter.
 */
export function UserTagFilter({ tags, value, onChange, disabled, className }: UserTagFilterProps) {
  const selected = new Set(value)

  function toggle(tagId: string) {
    if (selected.has(tagId)) {
      onChange(value.filter((id) => id !== tagId))
    } else {
      onChange([...value, tagId])
    }
  }

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-ink-400 uppercase">Your tags</p>
          <p className="mt-0.5 text-[11px] text-ink-500">Private filters — not global categories</p>
        </div>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={disabled}
            className="text-xs text-gold-400 transition hover:text-gold-400/80 disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>

      {tags.length === 0 ? (
        <p className="text-sm text-ink-500">
          No private tags yet. Create them in Settings or on a hymn’s details page.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by your tags">
          {tags.map((tag) => {
            const active = selected.has(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => toggle(tag.id)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition disabled:opacity-50',
                  active
                    ? 'border-gold-500/45 bg-gold-500/15 font-medium text-gold-400'
                    : 'border-ink-600 bg-ink-900/40 text-ink-300 hover:border-ink-500 hover:text-ink-100',
                )}
              >
                {tag.name}
              </button>
            )
          })}
        </div>
      )}

      {value.length > 0 && (
        <p className="mt-2 text-[11px] text-ink-500">Showing hymns that have all selected tags.</p>
      )}
    </div>
  )
}
