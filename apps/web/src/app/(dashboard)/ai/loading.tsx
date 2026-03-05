import { Skeleton, PageHeaderSkeleton } from '@/components/ui/skeleton'

export default function AIAssistantLoading() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeaderSkeleton />

      {/* Chat area */}
      <div
        className="flex-1 rounded-xl p-6 flex flex-col justify-between min-h-[400px]"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        {/* Empty chat state with starter prompt chips */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-5 w-56" />
          <div className="flex flex-wrap gap-3 justify-center max-w-md">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-40 rounded-full" />
            ))}
          </div>
        </div>

        {/* Input bar */}
        <div className="pt-4">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
