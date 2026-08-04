import { HYMN_LANGUAGES, type HymnLanguage, type TaxonomyMatchMode } from '../../constants/taxonomy'
import { MatchModeSelect } from './MatchModeSelect'
import { MultiSelectDropdown } from './MultiSelectDropdown'
import { cn } from '../../utils/cn'

interface LanguageFilterProps {
  value: readonly HymnLanguage[]
  onChange: (next: HymnLanguage[]) => void
  matchMode: TaxonomyMatchMode
  onMatchModeChange: (mode: TaxonomyMatchMode) => void
  label?: string
  disabled?: boolean
  className?: string
}

/** Compact languages dropdown — multi-select checkboxes + match mode. */
export function LanguageFilter({
  value,
  onChange,
  matchMode,
  onMatchModeChange,
  label = 'Languages',
  disabled,
  className,
}: LanguageFilterProps) {
  const hasSelection = value.length > 0

  return (
    <MultiSelectDropdown
      label={label}
      options={HYMN_LANGUAGES}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className}
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
          <p className="text-xs text-ink-500">Select one or more languages</p>
        )
      }
    />
  )
}
