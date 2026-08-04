import { Heart } from 'lucide-react'
import { cn } from '../../utils/cn'

interface FavoriteButtonProps {
  isFavorite: boolean
  busy?: boolean
  disabled?: boolean
  onToggle: (next: boolean) => void
  label?: string
  size?: 'sm' | 'md'
  className?: string
  /** Show text label next to the heart. */
  showLabel?: boolean
}

/** Private favorite toggle — empty heart = not favorited, filled = favorited. */
export function FavoriteButton({
  isFavorite,
  busy,
  disabled,
  onToggle,
  label = 'Favorite',
  size = 'md',
  className,
  showLabel = false,
}: FavoriteButtonProps) {
  const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-4 w-4'

  return (
    <button
      type="button"
      aria-label={isFavorite ? `Remove ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}
      aria-pressed={isFavorite}
      disabled={disabled || busy}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggle(!isFavorite)
      }}
      className={cn(
        'inline-flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 disabled:cursor-not-allowed disabled:opacity-50',
        showLabel
          ? cn(
              'gap-1.5 rounded-xl border font-medium',
              size === 'sm' ? 'min-h-10 px-3 text-xs sm:text-sm' : 'min-h-10 px-3.5 text-sm',
              isFavorite
                ? 'border-ember-500/40 bg-ember-500/15 text-ember-500'
                : 'border-ink-600 bg-ink-800/60 text-ink-300 hover:border-ember-500/30 hover:text-ember-500',
            )
          : cn(
              'rounded-full border',
              size === 'sm' ? 'h-10 w-10' : 'h-11 w-11',
              isFavorite
                ? 'border-ember-500/40 bg-ember-500/15 text-ember-500'
                : 'border-ink-600 bg-ink-900/40 text-ink-400 hover:border-ember-500/30 hover:text-ember-500',
            ),
        className,
      )}
    >
      <Heart className={cn(iconClass, isFavorite && 'fill-current')} strokeWidth={1.75} />
      {showLabel && <span>{label}</span>}
    </button>
  )
}
