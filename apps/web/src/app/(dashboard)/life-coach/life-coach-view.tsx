'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, AlertCircle, Flame, Zap, TrendingUp, Heart, Brain, DollarSign } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface CoachingInsight {
  title: string
  observation: string
  action: string
  impact: string
  domain: string
  urgency: 'high' | 'medium' | 'low'
}

interface CoachReport {
  insights: CoachingInsight[]
  summary: string
  focus_this_week: string
  generated_at: string
}

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  health: <Heart className="w-4 h-4" />,
  productivity: <Zap className="w-4 h-4" />,
  habits: <TrendingUp className="w-4 h-4" />,
  finance: <DollarSign className="w-4 h-4" />,
  mindset: <Brain className="w-4 h-4" />,
  goals: <Flame className="w-4 h-4" />,
}

const URGENCY_COLORS = {
  high: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', text: '#EF4444', label: 'High' },
  medium: { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.25)', text: '#EAB308', label: 'Medium' },
  low: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', text: '#22C55E', label: 'Low' },
}

export function LifeCoachView() {
  const [report, setReport] = useState<CoachReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force = false) => {
    if (force) setRegenerating(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/ai/life-coach${force ? '?force=true' : ''}`)
      const { data, error: err } = await res.json()
      if (err) throw new Error(err.message)
      setReport(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load coaching report')
    } finally {
      setLoading(false)
      setRegenerating(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-text-tertiary">Analysing your data…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6 flex items-center gap-3 text-red-400">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!report) return null

  const generatedDate = new Date(report.generated_at).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">Generated {generatedDate}</p>
        <button
          onClick={() => load(true)}
          disabled={regenerating}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      </div>

      {/* Summary card */}
      <div className="card p-5" style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.06) 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
      }}>
        <p className="text-sm text-text-primary leading-relaxed">{report.summary}</p>
        {report.focus_this_week && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Focus this week</p>
            <p className="text-sm font-medium text-primary-300">{report.focus_this_week}</p>
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="space-y-4">
        {report.insights.map((insight, i) => {
          const urgency = URGENCY_COLORS[insight.urgency] ?? URGENCY_COLORS.medium
          const domainIcon = DOMAIN_ICONS[insight.domain.toLowerCase()] ?? <Brain className="w-4 h-4" />
          return (
            <div key={i} className="card p-5 space-y-3">
              {/* Title row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-primary-300" style={{ background: 'rgba(99,102,241,0.12)' }}>
                    {domainIcon}
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">{insight.title}</h3>
                </div>
                <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium" style={{
                  background: urgency.bg,
                  border: `1px solid ${urgency.border}`,
                  color: urgency.text,
                }}>
                  {urgency.label}
                </span>
              </div>

              {/* Observation */}
              <p className="text-sm text-text-secondary leading-relaxed">{insight.observation}</p>

              {/* Action + Impact */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Action</p>
                  <p className="text-xs text-text-primary leading-relaxed">{insight.action}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Impact</p>
                  <p className="text-xs text-text-primary leading-relaxed">{insight.impact}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
