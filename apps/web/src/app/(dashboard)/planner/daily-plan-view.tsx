'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export function DailyPlanView() {
  const [plan, setPlan] = useState<string | null>(null)
  const [cached, setCached] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate(force = false) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/ai/daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error.message)
      setPlan(data.plan)
      setCached(data.cached)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate plan')
    } finally {
      setLoading(false)
    }
  }

  // Render markdown-like sections from the plan text
  function renderPlan(text: string) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return (
          <h3 key={i} className="text-sm font-semibold text-primary mt-5 mb-2 first:mt-0">
            {line.replace('## ', '')}
          </h3>
        )
      }
      if (line.trim() === '') return null
      return (
        <p key={i} className="text-sm text-text-primary leading-relaxed">
          {line}
        </p>
      )
    })
  }

  return (
    <div className="max-w-2xl space-y-4">
      {!plan ? (
        <div className="card p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <p className="font-medium text-text-primary">Generate your daily plan</p>
            <p className="text-sm text-text-secondary mt-1">
              VitaMind will analyse your tasks, goals, and habits to build a focused plan for today.
            </p>
          </div>
          <button
            onClick={() => generate(false)}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating…' : 'Generate plan'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-text-primary">Today&apos;s Plan</span>
              {cached && (
                <span className="badge bg-surface-tertiary text-text-tertiary text-xs">cached</span>
              )}
            </div>
            <button
              onClick={() => generate(true)}
              disabled={loading}
              className={cn('btn-ghost text-xs gap-1.5', loading && 'opacity-50')}
            >
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
              Regenerate
            </button>
          </div>
          <div className="space-y-1">{renderPlan(plan)}</div>
        </div>
      )}
    </div>
  )
}
