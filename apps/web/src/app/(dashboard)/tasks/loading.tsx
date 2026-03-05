import { Skeleton, PageHeaderSkeleton } from '@/components/ui/skeleton'

export default function TasksLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton hasAction />

      {/* Filter bar: status tabs + priority dropdown */}
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
        <div className="flex-1" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Task rows */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 flex-1 max-w-xs" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
