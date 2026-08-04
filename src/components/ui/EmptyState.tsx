import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils/cn'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-14 text-center',
        className,
      )}
    >
      {Icon && <Icon className="mx-auto mb-3 h-8 w-8 text-ink-500" strokeWidth={1.5} />}
      <p className="text-sm font-medium text-ink-200">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function ErrorState({ title, description, action, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-ember-500/40 bg-ember-500/10 px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <p className="text-sm font-medium text-ink-100">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
  /** Tighter header for dense mobile layouts (e.g. Hymn Library). */
  compact?: boolean
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  compact = false,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        compact
          ? 'mb-4 flex items-start justify-between gap-3'
          : 'mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && !compact && (
          <p className="mb-2 text-sm font-medium tracking-[0.18em] text-gold-500 uppercase">
            {eyebrow}
          </p>
        )}
        <h2
          className={cn(
            'font-display font-semibold text-ink-100',
            compact ? 'text-xl sm:text-3xl' : 'text-2xl sm:text-4xl',
          )}
        >
          {title}
        </h2>
        {description && !compact && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300 sm:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className={cn('flex shrink-0 flex-wrap gap-2', compact && 'pt-0.5')}>{actions}</div>
      )}
    </div>
  )
}
