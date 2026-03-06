'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BurnoutSignals {
  declining_velocity: boolean
  broken_streaks: number
  growing_backlog: boolean
  stalled_goals: number
  high_overdue_pressure: boolean
  low_habit_consistency: boolean
}

interface BurnoutData {
  current_risk: number
  signals: BurnoutSignals
  active_alert: { id: string; acknowledged: boolean } | null
  recovery_plan: string | null
  history: { date: string; risk_level: number }[]
}

const SIGNAL_LABELS: { key: keyof BurnoutSignals; label: string; format: (v: unknown) => string }[] = [
  { key: 'declining_velocity', label: 'Declining task velocity', format: (v) => v ? 'Yes' : 'No' },
  { key: 'broken_streaks', label: 'Broken habit streaks', format: (v) => `${v} habit(s)` },
  { key: 'growing_backlog', label: 'Growing backlog', format: (v) => v ? 'Yes' : 'No' },
  { key: 'stalled_goals', label: 'Stalled goals', format: (v) => `${v} goal(s)` },
  { key: 'high_overdue_pressure', label: 'High overdue pressure', format: (v) => v ? 'Yes' : 'No' },
  { key: 'low_habit_consistency', label: 'Low habit consistency', format: (v) => v ? 'Yes' : 'No' },
]

export function BurnoutRadar() {
  const [data, setData] = useState<BurnoutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [acknowledging, setAcknowledging] = useState(false)

  useEffect(() => {
    fetch('/api/v1/burnout-radar')
      .then((res) => res.json())
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-16 rounded-lg bg-surface-tertiary/30" />
      </div>
    )
  }

  if (!data) return null

  const risk = data.current_risk
  // Don't show if risk is very low
  if (risk < 30) return null

  const isHigh = risk >= 70
  const isMedium = risk >= 50
  const color = isHigh ? '#EF4444' : isMedium ? '#F59E0B' : '#10B981'
  const bgColor = isHigh ? 'rgba(239,68,68,0.08)' : isMedium ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'
  const borderColor = isHigh ? 'rgba(239,68,68,0.2)' : isMedium ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'
  const statusText = isHigh ? 'High Risk' : isMedium ? 'Moderate Risk' : 'Low Risk'
  const StatusIcon = isHigh ? AlertTriangle : isMedium ? Shield : CheckCircle

  const activeSignals = SIGNAL_LABELS.filter(({ key }) => {
    const val = data.signals[key]
    return typeof val === 'boolean' ? val : (val as number) > 0
  })

  async function handleAcknowledge() {
    if (!data?.active_alert?.id) return
    setAcknowledging(true)
    try {
      await fetch('/api/v1/burnout-radar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: data.active_alert.id }),
      })
      setData((prev) => prev ? { ...prev, active_alert: prev.active_alert ? { ...prev.active_alert, acknowledged: true } : null } : null)
    } finally {
      setAcknowledging(false)
    }
  }

  return (
    <div className="card overflow-hidden" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
              background: `${color}20`,
              border: `1px solid ${color}40`,
            }}>
              <StatusIcon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">Burnout Radar</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                  background: `${color}20`,
                  color,
                }}>
                  {statusText} ({risk}/100)
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">
                {activeSignals.length} warning signal{activeSignals.length !== 1 ? 's' : ''} detected
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 animate-fade-in">
            {/* Active signals */}
            {activeSignals.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-secondary">Warning Signals</p>
                <div className="space-y-1.5">
                  {activeSignals.map(({ key, label, format }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs text-text-tertiary">{label}</span>
                      <span className="text-xs font-medium" style={{ color }}>{format(data.signals[key])}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recovery plan */}
            {data.recovery_plan && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-secondary">Recovery Plan</p>
                <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-line rounded-lg p-3"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {data.recovery_plan}
                </div>
              </div>
            )}

            {/* Acknowledge */}
            {data.active_alert && !data.active_alert.acknowledged && (
              <button
                onClick={handleAcknowledge}
                disabled={acknowledging}
                className="w-full text-xs font-medium py-2 rounded-lg transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                {acknowledging ? 'Acknowledging...' : 'I\'ve seen this — dismiss for today'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
