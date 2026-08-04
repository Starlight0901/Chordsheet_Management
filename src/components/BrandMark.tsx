import { cn } from '../utils/cn'

interface BrandMarkProps {
  className?: string
  /** Icon box size classes, e.g. h-10 w-10 */
  sizeClassName?: string
  /** Icon glyph size classes */
  iconClassName?: string
}

/**
 * HymnBook brand mark — simple music note on a blue tile.
 * Recolors with theme tokens; works on light and dark surfaces.
 */
export function BrandMark({
  className,
  sizeClassName = 'h-10 w-10',
  iconClassName = 'h-5 w-5',
}: BrandMarkProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-gold-500 text-white shadow-sm shadow-gold-500/25',
        sizeClassName,
        className,
      )}
      aria-hidden
    >
      <svg
        className={iconClassName}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 18V6.5L19 4v11.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="7" cy="18" r="2.75" fill="currentColor" />
        <circle cx="17" cy="15.5" r="2.75" fill="currentColor" />
      </svg>
    </div>
  )
}
