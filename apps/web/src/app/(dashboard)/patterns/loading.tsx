import { PageHeaderSkeleton, CardSkeleton } from '@/components/ui/skeleton'

export default function PatternsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardSkeleton className="h-32" />
        <CardSkeleton className="h-32" />
        <CardSkeleton className="h-32" />
        <CardSkeleton className="h-32" />
      </div>
    </div>
  )
}
