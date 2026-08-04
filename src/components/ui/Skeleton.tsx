import { cn } from '../../utils/cn'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-ink-700/70', className)}
      aria-hidden
    />
  )
}

export function HymnCardSkeleton() {
  return (
    <div className="ui-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-3 w-24" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-6 h-8 w-48" />
      <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
      {Array.from({ length: rows }).map((_, index) => (
        <HymnCardSkeleton key={index} />
      ))}
    </div>
  )
}
