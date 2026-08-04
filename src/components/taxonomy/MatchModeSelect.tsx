import {
  TAXONOMY_MATCH_MODE_LABELS,
  TAXONOMY_MATCH_MODES,
  type TaxonomyMatchMode,
} from '../../constants/taxonomy'
import { cn } from '../../utils/cn'

interface MatchModeSelectProps {
  value: TaxonomyMatchMode
  onChange: (mode: TaxonomyMatchMode) => void
  labelledBy?: string
  disabled?: boolean
  className?: string
  /** Shorter labels for compact dropdowns. */
  compact?: boolean
}

const COMPACT_LABELS: Record<TaxonomyMatchMode, string> = {
  any: 'Any',
  all: 'All',
  exact: 'Exact',
}

/** Segmented control for any / all / exact taxonomy matching. */
export function MatchModeSelect({
  value,
  onChange,
  labelledBy,
  disabled,
  className,
  compact = false,
}: MatchModeSelectProps) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-label="Match mode"
      className={cn(
        'inline-flex flex-wrap gap-1 rounded-lg border border-ink-600 bg-ink-900/50 p-1',
        compact && 'w-full justify-stretch',
        className,
      )}
    >
      {TAXONOMY_MATCH_MODES.map((mode) => {
        const selected = value === mode
        return (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(mode)}
            className={cn(
              'rounded-md px-2.5 py-2 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 disabled:cursor-not-allowed disabled:opacity-50',
              compact ? 'min-h-10 flex-1' : 'min-h-9',
              selected
                ? 'bg-gold-500/20 font-medium text-gold-500'
                : 'text-ink-400 hover:bg-ink-700/60 hover:text-ink-200',
            )}
          >
            {compact ? COMPACT_LABELS[mode] : TAXONOMY_MATCH_MODE_LABELS[mode]}
          </button>
        )
      })}
    </div>
  )
}
