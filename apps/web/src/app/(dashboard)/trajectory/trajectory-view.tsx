'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, AlertCircle, TrendingUp, TrendingDown, Minus,
  Heart, Briefcase, Users, DollarSign, BookOpen, Sparkles, Zap,
} from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

type LifeDomain = 'health' | 'career' | 'relationships' | 'finance' | 'learning' | 'personal'

interface DomainVelocity {
  domain: LifeDomain
  score: number
  delta: number
  trend: 'up' | 'down' | 'stable'
}

interface HighestImpactAction {
  action: string
  domain: LifeDomain
  projectedImpact: string
}

interface TrajectoryReport {
  domains: DomainVelocity[]
  overallTrend: 'up' | 'down' | 'stable'
  highestImpactAction: HighestImpactAction
  generatedAt: string
}

const DOMAIN_META: Record<LifeDomain, { label: string; icon: React.ReactNode; color: string }> = {
  health:        { label: 'Health',        icon: <Heart className="w-4 h-4" />,     color: '#EF4444' },
  career:        { label: 'Career',        icon: <Briefcase className="w-4 h-4" />, color: '#6366F1' },
  relationships: { label: 'Relationships', icon: <Users className="w-4 h-4" />,     color: '#EC4899' },
  finance:       { label: 'Finance',       icon: <DollarSign className="w-4 h-4" />,color: '#22C55E' },
  learning:      { label: 'Learning',      icon: <BookOpen className="w-4 h-4" />,  color: '#F59E0B' },
  personal:      { label: 'Personal',      icon: <Sparkles className="w-4 h-4" />,  color: '#A855F7' },
}

const OVERALL_TREND_META = {
  up:     { label: 'Improving',  color: '#22C55E', Icon: TrendingUp },
  down:   { label: 'Declining',  color: '#EF4444', Icon: TrendingDown },
  stable: { label: 'Stable',     color: '#9CA3AF', Icon: Minus },
}

export function TrajectoryView() {
  const [report, setReport] = useState<TrajectoryReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force = false) => {
    if (force) setRegenerating(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/trajectory${force ? '?force=true' : ''}`)
      const { data, error: err } = await res.json()
      if (err) throw new Error(err.message)
      setReport(data as TrajectoryReport)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trajectory')
    } finally {
      setLoading(false)
      setRegenerating(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-text-tertiary">Computing your life trajectory…</p>
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

  const { Icon: OverallIcon, label: overallLabel, color: overallColor } = OVERALL_TREND_META[report.overallTrend]
  const hia = report.highestImpactAction
  const hiaColor = DOMAIN_META[hia.domain]?.color ?? '#6366F1'

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <OverallIcon className="w-4 h-4" style={{ color: overallColor }} />
          <span className="text-sm font-medium" style={{ color: overallColor }}>{overallLabel} overall</span>
          <span className="text-xs text-text-tertiary">· last 14 days vs prior 14 days</span>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={regenerating}
          className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-40"
        >
          {regenerating ? <Spinner size="sm" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      {/* Highest Impact Action */}
      <div
        className="card p-5 space-y-2"
        style={{ borderColor: `${hiaColor}40`, background: `${hiaColor}08` }}
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: hiaColor }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: hiaColor }}>
            Highest Impact Action Today
          </span>
        </div>
        <p className="text-sm font-medium text-text-primary">{hia.action}</p>
        <p className="text-xs text-text-tertiary">{hia.projectedImpact}</p>
      </div>

      {/* Domain grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {report.domains.map((d) => {
          const meta = DOMAIN_META[d.domain]
          const { Icon: TrendIcon, color: trendColor } =
            d.trend === 'up'   ? { Icon: TrendingUp,   color: '#22C55E' } :
            d.trend === 'down' ? { Icon: TrendingDown, color: '#EF4444' } :
                                 { Icon: Minus,        color: '#9CA3AF' }
          const deltaStr = d.delta > 0 ? `+${d.delta}` : `${d.delta}`

          return (
            <div key={d.domain} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ color: meta.color }}>{meta.icon}</span>
                  <span className="text-sm font-medium text-text-primary">{meta.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendIcon className="w-3.5 h-3.5" style={{ color: trendColor }} />
                  <span className="text-xs font-mono font-medium" style={{ color: trendColor }}>{deltaStr}pts</span>
                </div>
              </div>

              {/* Score bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-tertiary">Score</span>
                  <span className="text-sm font-bold text-text-primary">{d.score}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${d.score}%`, backgroundColor: meta.color }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-text-tertiary text-right">
        Updated {new Date(report.generatedAt).toLocaleString()}
      </p>
    </div>
  )
}
