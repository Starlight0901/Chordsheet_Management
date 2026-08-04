import { cn } from '../../utils/cn'

interface MultiSelectOption<T extends string> {
  value: T
  label: string
}

interface MultiSelectChipsProps<T extends string> {
  options: readonly MultiSelectOption<T>[] | readonly T[]
  value: readonly T[]
  onChange: (next: T[]) => void
  labelledBy?: string
  ariaLabel?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

function normalizeOptions<T extends string>(
  options: readonly MultiSelectOption<T>[] | readonly T[],
): MultiSelectOption<T>[] {
  return options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  )
}

export function MultiSelectChips<T extends string>({
  options,
  value,
  onChange,
  labelledBy,
  ariaLabel,
  disabled = false,
  size = 'md',
  className,
}: MultiSelectChipsProps<T>) {
  const normalized = normalizeOptions(options)
  const selected = new Set(value)

  function toggle(optionValue: T) {
    if (disabled) return
    if (selected.has(optionValue)) {
      onChange(value.filter((item) => item !== optionValue))
      return
    }
    onChange([...value, optionValue])
  }

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-label={ariaLabel}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {normalized.map((option) => {
        const isSelected = selected.has(option.value)
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => toggle(option.value)}
            className={cn(
              'rounded-full border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 disabled:cursor-not-allowed disabled:opacity-50',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
              isSelected
                ? 'border-gold-500/50 bg-gold-500/15 font-medium text-gold-400'
                : 'border-ink-600 bg-ink-800/50 text-ink-300 hover:border-ink-500 hover:bg-ink-700/60 hover:text-ink-100',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
