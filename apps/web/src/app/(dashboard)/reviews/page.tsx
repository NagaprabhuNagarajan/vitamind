'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Calendar, ChevronRight, Loader2, ArrowLeft, RefreshCw } from 'lucide-react'

interface ReviewData {
  tasks_completed: number
  tasks_created: number
  completion_rate: number
  habits_completion_rate: number
  best_streak: { habit: string; days: number }
  avg_momentum: number
  burnout_events: number
}

interface LifeReview {
  id: string
  month: string
  report: string
  data: ReviewData
  created_at: string
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<LifeReview[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<LifeReview | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/life-reviews')
      .then((res) => res.json())
      .then(({ data }) => setReviews(data?.reviews ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleGenerate(month: string) {
    setGenerating(month)
    try {
      const res = await fetch('/api/v1/life-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      })
      const { data } = await res.json()
      if (data?.review) {
        setReviews((prev) => [data.review, ...prev.filter((r) => r.month !== month)])
        setSelected(data.review)
      }
    } finally {
      setGenerating(null)
    }
  }

  function formatMonth(month: string) {
    const [y, m] = month.split('-').map(Number)
    return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // Get available past months (last 12) that don't have reviews
  function getAvailableMonths(): string[] {
    const months: string[] = []
    const now = new Date()
    const existingMonths = new Set(reviews.map((r) => r.month))
    for (let i = 1; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!existingMonths.has(key)) months.push(key)
    }
    return months
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Life Reviews</h1>
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-20 rounded-lg bg-surface-tertiary/30" />
          </div>
        ))}
      </div>
    )
  }

  // Detail view
  if (selected) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to reviews
        </button>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-primary">{formatMonth(selected.month)}</h1>
          <span className="text-xs text-text-tertiary">
            Generated {new Date(selected.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tasks Done', value: selected.data.tasks_completed, color: '#6366F1' },
            { label: 'Completion', value: `${selected.data.completion_rate}%`, color: '#10B981' },
            { label: 'Habit Rate', value: `${selected.data.habits_completion_rate}%`, color: '#A855F7' },
            { label: 'Momentum', value: `${selected.data.avg_momentum}/100`, color: '#06B6D4' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4 text-center" style={{
              borderTop: `2px solid ${color}30`,
            }}>
              <p className="text-lg font-bold text-text-primary">{value}</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Best streak */}
        {selected.data.best_streak.days > 0 && (
          <div className="card p-4 flex items-center gap-3" style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.15)',
          }}>
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Best Streak: {selected.data.best_streak.habit}
              </p>
              <p className="text-xs text-text-tertiary">{selected.data.best_streak.days} days</p>
            </div>
          </div>
        )}

        {/* AI Report */}
        <div className="card p-6">
          <div className="prose prose-invert prose-sm max-w-none text-text-secondary leading-relaxed"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {selected.report}
          </div>
        </div>
      </div>
    )
  }

  // List view
  const availableMonths = getAvailableMonths()

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Life Reviews</h1>
          <p className="text-xs text-text-tertiary mt-1">Monthly &quot;State of Your Life&quot; reports</p>
        </div>
        <BookOpen className="w-5 h-5 text-text-tertiary" />
      </div>

      {/* Existing reviews */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => (
            <button
              key={review.id}
              onClick={() => setSelected(review)}
              className="card p-5 w-full text-left group hover:border-primary-500/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                    background: 'rgba(99,102,241,0.12)',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}>
                    <Calendar className="w-5 h-5 text-primary-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{formatMonth(review.month)}</p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">
                      {review.data.tasks_completed} tasks &middot; {review.data.habits_completion_rate}% habits &middot; {review.data.avg_momentum} momentum
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Generate new review */}
      {availableMonths.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">Generate a Review</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableMonths.slice(0, 6).map((month) => (
              <button
                key={month}
                onClick={() => handleGenerate(month)}
                disabled={generating !== null}
                className="card p-3 text-center text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                {generating === month ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  formatMonth(month)
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {reviews.length === 0 && availableMonths.length === 0 && (
        <div className="card p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-text-tertiary mx-auto" />
          <h3 className="text-base font-semibold text-text-primary">No reviews yet</h3>
          <p className="text-sm text-text-tertiary max-w-md mx-auto">
            Life reviews become available after your first full month of using VitaMind.
          </p>
        </div>
      )}
    </div>
  )
}
