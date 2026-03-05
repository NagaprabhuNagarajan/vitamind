import { Skeleton, PageHeaderSkeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />

      {/* Profile form section */}
      <div
        className="rounded-xl p-6 space-y-6"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <Skeleton className="h-5 w-20" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        {/* Form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Security section */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <Skeleton className="h-5 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>
    </div>
  )
}
