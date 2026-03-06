export default function ReviewsLoading() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="h-7 w-36 rounded-lg bg-surface-tertiary/30 animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-6 animate-pulse">
          <div className="h-14 rounded-lg bg-surface-tertiary/30" />
        </div>
      ))}
    </div>
  )
}
