import { PageHeaderSkeleton } from '@/components/ui/skeleton'

/**
 * Loading skeleton for the Life Timeline page.
 * Mirrors the page layout: header, filter bar, and timeline event cards.
 */
export default function TimelineLoading() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <PageHeaderSkeleton />

      {/* Filter bar skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-8 rounded-full animate-pulse"
              style={{
                width: `${48 + i * 8}px`,
                background: 'rgba(255,255,255,0.06)',
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 h-10 rounded-lg animate-pulse"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          />
          <div
            className="h-10 w-28 rounded-lg animate-pulse"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          />
        </div>
      </div>

      {/* Date header skeleton */}
      <div className="flex items-center gap-3">
        <div
          className="h-3 w-16 rounded animate-pulse"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Event card skeletons */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-xl p-4 animate-pulse"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            />
            <div className="flex-1 space-y-2">
              <div
                className="h-4 rounded"
                style={{
                  width: `${120 + i * 24}px`,
                  background: 'rgba(255,255,255,0.06)',
                }}
              />
              <div
                className="h-3 w-24 rounded"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
