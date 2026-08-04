import { HYMN_CATEGORIES, type HymnCategory } from '../../constants/taxonomy'
import { MultiSelectChips } from './MultiSelectChips'

interface CategorySelectorProps {
  value: readonly HymnCategory[]
  onChange: (next: HymnCategory[]) => void
  label?: string
  disabled?: boolean
  className?: string
}

const LABEL_ID = 'category-selector-label'

/** Multi-select for hymn create/edit forms. Global categories only — not user-editable. */
export function CategorySelector({
  value,
  onChange,
  label = 'Categories',
  disabled,
  className,
}: CategorySelectorProps) {
  return (
    <div className={className}>
      <p id={LABEL_ID} className="mb-2 text-sm font-medium text-ink-200">
        {label}
      </p>
      <p className="mb-3 text-xs text-ink-400">
        Choose from the shared hymn categories. Custom categories cannot be added.
      </p>
      <MultiSelectChips
        options={HYMN_CATEGORIES}
        value={value}
        onChange={onChange}
        labelledBy={LABEL_ID}
        disabled={disabled}
      />
    </div>
  )
}
