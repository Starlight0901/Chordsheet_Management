import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface MultiSelectOption<T extends string> {
  value: T
  label: string
}

interface MultiSelectDropdownProps<T extends string> {
  label: string
  options: readonly MultiSelectOption<T>[] | readonly T[]
  value: readonly T[]
  onChange: (next: T[]) => void
  searchable?: boolean
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  /** Extra content inside the panel (e.g. match mode). */
  header?: ReactNode
  /** Prefer opening the menu to the right edge on narrow layouts. */
  align?: 'start' | 'end'
}

function normalizeOptions<T extends string>(
  options: readonly MultiSelectOption<T>[] | readonly T[],
): MultiSelectOption<T>[] {
  return options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  )
}

/**
 * Compact trigger + checkbox popover for multi-select filters.
 * Preserves selection state; does not own filter matching logic.
 */
export function MultiSelectDropdown<T extends string>({
  label,
  options,
  value,
  onChange,
  searchable = false,
  searchPlaceholder = 'Search…',
  disabled,
  className,
  header,
  align = 'start',
}: MultiSelectDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const triggerId = useId()

  const normalized = normalizeOptions(options)
  const selected = new Set(value)
  const count = value.length

  const filtered = searchable
    ? normalized.filter((option) =>
        option.label.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : normalized

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    if (searchable) {
      window.requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open, searchable])

  function toggle(optionValue: T) {
    if (disabled) return
    if (selected.has(optionValue)) {
      onChange(value.filter((item) => item !== optionValue))
      return
    }
    onChange([...value, optionValue])
  }

  const triggerLabel = count > 0 ? `${label} (${count})` : label

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={count > 0 ? `${label}, ${count} selected` : label}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border px-3 text-left text-sm transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open || count > 0
            ? 'border-gold-500/40 bg-gold-500/10 text-ink-100'
            : 'border-ink-600 bg-ink-900/50 text-ink-200 hover:border-ink-500',
        )}
      >
        <span className="min-w-0 truncate font-medium">{triggerLabel}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-ink-400 transition', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={triggerId}
          className={cn(
            'absolute z-40 mt-1.5 max-h-[min(22rem,70dvh)] w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-ink-600 bg-ink-850 shadow-xl',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {header && <div className="border-b border-ink-700/70 px-3 py-2.5">{header}</div>}

          {searchable && (
            <div className="border-b border-ink-700/70 p-2.5">
              <label className="sr-only" htmlFor={`${listId}-search`}>
                Search {label.toLowerCase()}
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
                <input
                  ref={searchRef}
                  id={`${listId}-search`}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-ink-600 bg-ink-900/60 py-2.5 pr-2.5 pl-8 text-base text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/25 sm:text-sm"
                />
              </div>
            </div>
          )}

          <ul className="max-h-56 overflow-y-auto overscroll-contain p-1.5">
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-ink-500">No matches</li>
            )}
            {filtered.map((option) => {
              const isSelected = selected.has(option.value)
              const optionId = `${listId}-${option.value}`
              return (
                <li key={option.value}>
                  <label
                    htmlFor={optionId}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm transition',
                      isSelected
                        ? 'bg-gold-500/12 text-ink-100'
                        : 'text-ink-200 hover:bg-ink-700/60',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        isSelected
                          ? 'border-gold-500 bg-gold-500 text-white'
                          : 'border-ink-500 bg-ink-900/70',
                      )}
                      aria-hidden
                    >
                      {isSelected && <Check className="h-3 w-3" strokeWidth={2.5} />}
                    </span>
                    <input
                      id={optionId}
                      type="checkbox"
                      className="sr-only"
                      checked={isSelected}
                      disabled={disabled}
                      onChange={() => toggle(option.value)}
                    />
                    <span className="min-w-0 flex-1 leading-snug">{option.label}</span>
                  </label>
                </li>
              )
            })}
          </ul>

          {count > 0 && (
            <div className="border-t border-ink-700/70 px-3 py-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange([])}
                className="text-xs text-gold-500 transition hover:text-gold-400 disabled:opacity-50"
              >
                Clear {label.toLowerCase()}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
