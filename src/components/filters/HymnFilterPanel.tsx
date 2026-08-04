import { Search } from 'lucide-react'
import { UserTagFilter } from '../hymns/UserTagFilter'
import { CategoryFilter, LanguageFilter } from '../taxonomy'
import type { UserTag } from '../../types'
import {
  createEmptyHymnFilter,
  hasActiveHymnFilters,
  type HymnFilterState,
} from '../../utils/hymnFilters'
import { cn } from '../../utils/cn'

interface HymnFilterPanelProps {
  value: HymnFilterState
  onChange: (next: HymnFilterState) => void
  userTags?: readonly UserTag[]
  /** Show name search (library / personal lists / picker). Default true. */
  showSearch?: boolean
  /** Show private tag filters. Default true when userTags provided. */
  showUserTags?: boolean
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  /** Tighter spacing for Hymn Library. */
  compact?: boolean
}

/**
 * Shared filter UI for Hymn Library, Personal Lists, and Worship hymn picker.
 * Uses the same HymnFilterState → filterHymns path everywhere.
 */
export function HymnFilterPanel({
  value,
  onChange,
  userTags = [],
  showSearch = true,
  showUserTags = true,
  searchPlaceholder = 'Search hymns by name…',
  disabled,
  className,
  compact = false,
}: HymnFilterPanelProps) {
  function patch(partial: Partial<HymnFilterState>) {
    onChange({ ...value, ...partial })
  }

  const active = hasActiveHymnFilters(value)
  const taxonomyActive = value.languages.length > 0 || value.categories.length > 0

  return (
    <div
      className={cn(
        compact ? 'space-y-3' : 'ui-panel space-y-4 p-4 sm:p-5',
        !compact && className,
        compact && className,
      )}
    >
      {showSearch && (
        <div>
          {!compact && (
            <label
              htmlFor="hymn-filter-search"
              className="mb-2 block text-xs font-medium tracking-wide text-ink-400 uppercase"
            >
              Search
            </label>
          )}
          {compact && (
            <label htmlFor="hymn-filter-search" className="sr-only">
              Search hymns
            </label>
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              id="hymn-filter-search"
              type="search"
              value={value.query}
              onChange={(event) => patch({ query: event.target.value })}
              placeholder={searchPlaceholder}
              disabled={disabled}
              autoComplete="off"
              className="min-h-11 w-full rounded-xl border border-ink-600 bg-ink-900/50 py-2.5 pr-3 pl-9 text-base text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30 disabled:opacity-50 sm:text-sm"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        <LanguageFilter
          value={value.languages}
          onChange={(languages) => patch({ languages })}
          matchMode={value.languageMode}
          onMatchModeChange={(languageMode) => patch({ languageMode })}
          disabled={disabled}
        />
        <CategoryFilter
          value={value.categories}
          onChange={(categories) => patch({ categories })}
          matchMode={value.categoryMode}
          onMatchModeChange={(categoryMode) => patch({ categoryMode })}
          disabled={disabled}
        />
      </div>

      {showUserTags && userTags.length > 0 && (
        <div className={cn(!compact && 'border-t border-ink-700/60 pt-4')}>
          <UserTagFilter
            tags={userTags}
            value={value.userTagIds}
            onChange={(userTagIds) => patch({ userTagIds })}
            disabled={disabled}
          />
        </div>
      )}

      {active && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(createEmptyHymnFilter())}
            className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm text-gold-500 transition hover:bg-gold-500/10 hover:text-gold-400 disabled:opacity-50"
          >
            {taxonomyActive || value.userTagIds.length > 0
              ? 'Clear filters'
              : 'Clear search & filters'}
          </button>
        </div>
      )}
    </div>
  )
}
