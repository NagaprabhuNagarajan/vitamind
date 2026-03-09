'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, AlertCircle, Zap, TrendingUp, TrendingDown, Minus,
  Heart, Briefcase, Users, DollarSign, BookOpen, Sparkles, Activity, Flame,
} from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

type LifeDomain = 'health' | 'career' | 'relationships' | 'finance' | 'learning' | 'personal'

interface DomainVelocity {
  domain: LifeDomain
  score: number
  delta: number
  trend: 'up' | 'down' | 'stable'
}

interface LifeReport {
  greeting: string
  momentumScore: number
  momentumTrend: number[]
  burnoutRisk: 'low' | 'medium' | 'high'
  topInsight: string
  highestImpactAction: { action: string; domain: LifeDomain; projectedImpact: string }
  domains: DomainVelocity[]
  healthSummary: string | null
  generatedAt: string
}

const DOMAIN_META: Record<LifeDomain, { label: string; icon: React.ReactNode; color: string }> = {
  health:        { label: 'Health',        icon: <Heart className="w-3.5 h-3.5" />,     color: '#EF4444' },
  career:        { label: 'Career',        icon: <Briefcase className="w-3.5 h-3.5" />, color: '#6366F1' },
  relationships: { label: 'Relationships', icon: <Users className="w-3.5 h-3.5" />,     color: '#EC4899' },
  finance:       { label: 'Finance',       icon: <DollarSign className="w-3.5 h-3.5" />,color: '#22C55E' },
  learning:      { label: 'Learning',      icon: <BookOpen className="w-3.5 h-3.5" />,  color: '#F59E0B' },
  personal:      { label: 'Personal',      icon: <Sparkles className="w-3.5 h-3.5" />,  color: '#A855F7' },
}

const BURNOUT_META = {
  low:    { label: 'Low Risk',    bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',   text: '#22C55E' },
  medium: { label: 'Medium Risk', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.3)',   text: '#EAB308' },
  high:   { label: 'High Risk',   bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   text: '#EF4444' },
}

export function LifeReportView() {
  const [report, setReport] = useState<LifeReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force = false) => {
    if (force) setRegenerating(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/ai/life-report${force ? '?force=true' : ''}`)
      const { data, error: err } = await res.json()
      if (err) throw new Error(err.message)
      setReport(data as LifeReport)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load life report')
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
        <p className="text-sm text-text-tertiary">Preparing your morning briefing…</p>
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

  const burnout = BURNOUT_META[report.burnoutRisk]
  const hia = report.highestImpactAction
  const hiaColor = DOMAIN_META[hia.domain]?.color ?? '#6366F1'

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={() => void load(true)}
          disabled={regenerating}
          className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-40"
        >
          {regenerating ? <Spinner size="sm" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Regenerate
        </button>
      </div>

      {/* AI Greeting */}
      <div className="card p-6 space-y-1" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(168,85,247,0.06) 100%)' }}>
        <p className="text-base font-medium text-text-primary leading-relaxed">{report.greeting}</p>
        {report.healthSummary && (
          <p className="text-xs text-text-tertiary pt-1">{report.healthSummary}</p>
        )}
      </div>

      {/* Stats row: momentum + burnout */}
      <div className="grid grid-cols-2 gap-3">
        {/* Momentum */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-text-tertiary uppercase tracking-wider">Momentum</span>
          </div>
          <p className="text-3xl font-bold text-indigo-400">{report.momentumScore}</p>
          {report.momentumTrend.length > 1 && (
            <Sparkline values={report.momentumTrend} />
          )}
        </div>

        {/* Burnout */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4" style={{ color: burnout.text }} />
            <span className="text-xs text-text-tertiary uppercase tracking-wider">Burnout</span>
          </div>
          <div
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
            style={{ background: burnout.bg, borderColor: burnout.border, color: burnout.text }}
          >
            {burnout.label}
          </div>
        </div>
      </div>

      {/* Top Insight */}
      <div className="card p-4 flex items-start gap-3">
        <TrendingUp className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Top Pattern</p>
          <p className="text-sm text-text-primary">{report.topInsight}</p>
        </div>
      </div>

      {/* Highest Impact Action */}
      <div
        className="card p-5 space-y-2"
        style={{ borderColor: `${hiaColor}40`, background: `${hiaColor}08` }}
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: hiaColor }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: hiaColor }}>
            Highest Impact Action
          </span>
        </div>
        <p className="text-sm font-medium text-text-primary">{hia.action}</p>
        <p className="text-xs text-text-tertiary">{hia.projectedImpact}</p>
      </div>

      {/* Domain mini-grid */}
      {report.domains.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">Life Domains</p>
          <div className="grid grid-cols-3 gap-2">
            {report.domains.map((d) => {
              const meta = DOMAIN_META[d.domain]
              const TrendIcon = d.trend === 'up' ? TrendingUp : d.trend === 'down' ? TrendingDown : Minus
              const trendColor = d.trend === 'up' ? '#22C55E' : d.trend === 'down' ? '#EF4444' : '#6B7280'
              return (
                <div key={d.domain} className="card p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span style={{ color: meta.color }}>{meta.icon}</span>
                    <TrendIcon className="w-3 h-3" style={{ color: trendColor }} />
                  </div>
                  <p className="text-xs text-text-tertiary truncate">{meta.label}</p>
                  <p className="text-sm font-bold text-text-primary">{d.score}%</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-text-tertiary text-right">
        Generated {new Date(report.generatedAt).toLocaleString()}
      </p>
    </div>
  )
}

// ─── Mini sparkline SVG ───────────────────────────────────────────────────────

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 80
  const h = 24
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-70">
      <polyline
        points={pts}
        fill="none"
        stroke="#6366F1"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
