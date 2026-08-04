import { HYMN_LANGUAGES, type HymnLanguage } from '../../constants/taxonomy'
import { MultiSelectChips } from './MultiSelectChips'

interface LanguageSelectorProps {
  value: readonly HymnLanguage[]
  onChange: (next: HymnLanguage[]) => void
  label?: string
  disabled?: boolean
  className?: string
}

const LABEL_ID = 'language-selector-label'

/** Multi-select for hymn create/edit forms. */
export function LanguageSelector({
  value,
  onChange,
  label = 'Languages',
  disabled,
  className,
}: LanguageSelectorProps) {
  return (
    <div className={className}>
      <p id={LABEL_ID} className="mb-2 text-sm font-medium text-ink-200">
        {label}
      </p>
      <p className="mb-3 text-xs text-ink-400">Select one or more languages.</p>
      <MultiSelectChips
        options={HYMN_LANGUAGES}
        value={value}
        onChange={onChange}
        labelledBy={LABEL_ID}
        disabled={disabled}
      />
    </div>
  )
}
