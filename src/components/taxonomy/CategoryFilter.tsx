import { HYMN_CATEGORIES, type HymnCategory, type TaxonomyMatchMode } from '../../constants/taxonomy'
import { MatchModeSelect } from './MatchModeSelect'
import { MultiSelectDropdown } from './MultiSelectDropdown'
import { cn } from '../../utils/cn'

interface CategoryFilterProps {
  value: readonly HymnCategory[]
  onChange: (next: HymnCategory[]) => void
  matchMode: TaxonomyMatchMode
  onMatchModeChange: (mode: TaxonomyMatchMode) => void
  label?: string
  disabled?: boolean
  className?: string
}

/** Compact searchable categories dropdown — multi-select checkboxes + match mode. */
export function CategoryFilter({
  value,
  onChange,
  matchMode,
  onMatchModeChange,
  label = 'Categories',
  disabled,
  className,
}: CategoryFilterProps) {
  const hasSelection = value.length > 0

  return (
    <MultiSelectDropdown
      label={label}
      options={HYMN_CATEGORIES}
      value={value}
      onChange={onChange}
      searchable
      searchPlaceholder="Search categories…"
      disabled={disabled}
      className={className}
      align="end"
      header={
        hasSelection ? (
          <div>
            <p className="mb-1.5 text-[10px] font-medium tracking-wide text-ink-500 uppercase">
              Matching
            </p>
            <MatchModeSelect
              value={matchMode}
              onChange={onMatchModeChange}
              disabled={disabled}
              compact
              className={cn('w-full')}
            />
          </div>
        ) : (
          <p className="text-xs text-ink-500">Select one or more categories</p>
        )
      }
    />
  )
}
