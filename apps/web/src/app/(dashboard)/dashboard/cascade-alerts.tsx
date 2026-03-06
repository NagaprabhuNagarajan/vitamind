'use client'

import { useState, useEffect } from 'react'
import { Link2, AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react'

interface AffectedGoal {
  goal_title: string
  impact_weight: number
  estimated_delay_days: number
}

interface CascadeAnalysis {
  habit_title: string
  missed_days: number
  affected_goals: AffectedGoal[]
  suggestion: string
}

interface CascadeData {
  suggestions: CascadeAnalysis[]
  active_cascades: { id: string; acknowledged: boolean }[]
}

export function CascadeAlerts() {
  const [data, setData] = useState<CascadeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch('/api/v1/cascade')
      .then((res) => res.json())
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data?.suggestions?.length) return null

  const cascades = data.suggestions

  return (
    <div className="card overflow-hidden" style={{
      background: 'rgba(245,158,11,0.06)',
      border: '1px solid rgba(245,158,11,0.15)',
    }}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.3)',
            }}>
              <Link2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-text-primary">Cascade Alert</span>
              <p className="text-xs text-text-tertiary mt-0.5">
                {cascades.length} habit{cascades.length !== 1 ? 's' : ''} affecting linked goals
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {!expanded && cascades.length > 0 && (
          <p className="mt-2 text-xs text-amber-400/80">
            Missing "{cascades[0].habit_title}" is delaying {cascades[0].affected_goals.length} goal{cascades[0].affected_goals.length !== 1 ? 's' : ''}.
            {cascades.length > 1 ? ` +${cascades.length - 1} more` : ''}
          </p>
        )}

        {expanded && (
          <div className="mt-4 space-y-4 animate-fade-in">
            {cascades.map((cascade, i) => (
              <div key={i} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-text-primary">
                    "{cascade.habit_title}" — missed {cascade.missed_days}/7 days
                  </span>
                </div>

                <div className="space-y-1 mb-2">
                  {cascade.affected_goals.map((goal, j) => (
                    <div key={j} className="flex items-center justify-between text-xs">
                      <span className="text-text-tertiary">{goal.goal_title}</span>
                      <span className="text-amber-400/80">~{goal.estimated_delay_days} day delay</span>
                    </div>
                  ))}
                </div>

                {cascade.suggestion && (
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed" style={{
                    borderLeft: '2px solid rgba(245,158,11,0.3)',
                    paddingLeft: '8px',
                  }}>
                    {cascade.suggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
