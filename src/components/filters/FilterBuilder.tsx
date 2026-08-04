import { CategoryFilter, LanguageFilter } from '../taxonomy'
import { UserTagFilter } from '../hymns/UserTagFilter'
import type { SmartListFilter, UserTag } from '../../types'
import {
  describeSmartListFilter,
  hasActiveSmartListFilter,
  sanitizeSmartListFilter,
} from '../../utils/hymnFilters'
import { cn } from '../../utils/cn'

interface FilterBuilderProps {
  value: SmartListFilter
  onChange: (next: SmartListFilter) => void
  userTags?: readonly UserTag[]
  disabled?: boolean
  className?: string
  /** Show a live summary of the saved definition. Default true. */
  showSummary?: boolean
}

/**
 * Builds a Smart List filter definition (languages, categories, optional tags).
 * Does not store or select hymn IDs.
 */
export function FilterBuilder({
  value,
  onChange,
  userTags = [],
  disabled,
  className,
  showSummary = true,
}: FilterBuilderProps) {
  const filter = sanitizeSmartListFilter(value)

  function patch(partial: Partial<SmartListFilter>) {
    onChange(sanitizeSmartListFilter({ ...filter, ...partial }))
  }

  return (
    <div className={cn('space-y-5', className)}>
      <div>
        <p className="mb-1 text-sm font-medium text-ink-100">Filter definition</p>
        <p className="text-xs text-ink-500">
          Smart Lists save this definition only. Matching hymns update automatically — hymn IDs are
          never stored.
        </p>
      </div>

      <div className="rounded-2xl border border-ink-700/70 bg-ink-800/40 p-4 sm:p-5">
        <LanguageFilter
          value={filter.languages}
          onChange={(languages) => patch({ languages })}
          matchMode={filter.languageMode}
          onMatchModeChange={(languageMode) => patch({ languageMode })}
          disabled={disabled}
        />
      </div>

      <div className="rounded-2xl border border-ink-700/70 bg-ink-800/40 p-4 sm:p-5">
        <CategoryFilter
          value={filter.categories}
          onChange={(categories) => patch({ categories })}
          matchMode={filter.categoryMode}
          onMatchModeChange={(categoryMode) => patch({ categoryMode })}
          disabled={disabled}
        />
      </div>

      <div className="rounded-2xl border border-ink-700/70 bg-ink-800/40 p-4 sm:p-5">
        <UserTagFilter
          tags={userTags}
          value={filter.userTagIds}
          onChange={(userTagIds) => patch({ userTagIds })}
          disabled={disabled}
        />
      </div>

      {showSummary && (
        <div className="rounded-xl border border-ink-700/60 bg-ink-900/40 px-4 py-3">
          <p className="text-[11px] tracking-wide text-ink-500 uppercase">Preview</p>
          <p className="mt-1 text-sm text-ink-300">
            {hasActiveSmartListFilter(filter)
              ? describeSmartListFilter(filter, userTags)
              : 'No filters selected — this smart list would include every hymn.'}
          </p>
        </div>
      )}
    </div>
  )
}
