import { Skeleton, PageHeaderSkeleton } from '@/components/ui/skeleton'

export default function GoalsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton hasAction />

      {/* Goal cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-5 space-y-4"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            {/* Progress bar */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
