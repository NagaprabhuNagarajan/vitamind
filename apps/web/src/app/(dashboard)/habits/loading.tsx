import { Skeleton, PageHeaderSkeleton } from '@/components/ui/skeleton'

export default function HabitsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton hasAction />

      {/* Habit cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-5 space-y-4"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-4 w-24" />
            {/* Streak counter */}
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
