import { Skeleton, PageHeaderSkeleton } from '@/components/ui/skeleton'

export default function PlannerLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />

      {/* Large planner content area */}
      <div
        className="rounded-xl p-6 space-y-5"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        {/* Time block skeletons */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-4 w-16 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
