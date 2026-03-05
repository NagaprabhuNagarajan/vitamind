import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

/**
 * Animated placeholder block used in loading states.
 * Uses a subtle white overlay on the dark theme background
 * to indicate content is being fetched.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-lg', className)}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  )
}

/** Mimics the PageHeader layout used across all dashboard pages. */
export function PageHeaderSkeleton({ hasAction = false }: { hasAction?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {hasAction && <Skeleton className="h-10 w-32 rounded-md" />}
    </div>
  )
}

/** Reusable card-shaped skeleton with configurable inner content height. */
export function CardSkeleton({ className, innerClassName }: { className?: string; innerClassName?: string }) {
  return (
    <div
      className={cn('rounded-xl p-5', className)}
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <Skeleton className={cn('h-4 w-24 mb-3', undefined)} />
      <Skeleton className={cn('h-8 w-16', innerClassName)} />
    </div>
  )
}
