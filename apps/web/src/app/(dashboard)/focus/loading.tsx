export default function FocusLoading() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="h-7 w-32 rounded-lg bg-surface-tertiary/30 animate-pulse" />
      <div className="card p-6 animate-pulse">
        <div className="h-32 rounded-lg bg-surface-tertiary/30" />
      </div>
      <div className="card p-6 animate-pulse">
        <div className="h-20 rounded-lg bg-surface-tertiary/30" />
      </div>
    </div>
  )
}
