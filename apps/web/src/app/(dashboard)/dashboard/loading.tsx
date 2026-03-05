import { Skeleton, PageHeaderSkeleton, CardSkeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Greeting header */}
      <PageHeaderSkeleton />

      {/* 4 stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* AI insight card */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Two-column: tasks + habits/goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task list skeleton */}
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <Skeleton className="h-5 w-28 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>

        {/* Habits + Goals column */}
        <div className="space-y-6">
          <div
            className="rounded-xl p-5 space-y-3"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <Skeleton className="h-5 w-28 mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
          <div
            className="rounded-xl p-5 space-y-3"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <Skeleton className="h-5 w-28 mb-4" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
