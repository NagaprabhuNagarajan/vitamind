'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, Minus, BarChart3, Trophy, AlertTriangle,
  Zap, Heart, Target, Clock,
} from 'lucide-react'
import type { BehavioralTrendsResult, WeekSummary, TrendDirection } from '@/features/behavioral-trends/services/trends.service'

// ── helpers ──────────────────────────────────────────────────────────────────

function TrendIcon({ direction, size = 14 }: { direction: TrendDirection; size?: number }) {
  if (direction === 'improving') return <TrendingUp style={{ width: size, height: size }} className="text-emerald-400" />
  if (direction === 'declining') return <TrendingDown style={{ width: size, height: size }} className="text-red-400" />
  return <Minus style={{ width: size, height: size }} className="text-text-tertiary" />
}

function trendColor(direction: TrendDirection) {
  if (direction === 'improving') return '#10B981'
  if (direction === 'declining') return '#EF4444'
  return 'rgba(255,255,255,0.4)'
}

function scoreColor(score: number) {
  if (score >= 70) return '#10B981'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}

// ── mini sparkline (SVG) ─────────────────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const w = 120
  const h = 36
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ── week bar chart ────────────────────────────────────────────────────────────

function WeekBars({ weeks }: { weeks: WeekSummary[] }) {
  const [tooltip, setTooltip] = useState<{ week: WeekSummary; x: number } | null>(null)

  return (
    <div className="relative">
      <div className="flex items-end gap-1.5 h-24">
        {weeks.map((w) => {
          const pct = w.avg_score / 100
          const color = scoreColor(w.avg_score)
          return (
            <div
              key={w.week_start}
              className="flex-1 relative flex flex-col justify-end cursor-pointer group"
              onMouseEnter={(e) => setTooltip({ week: w, x: e.currentTarget.offsetLeft })}
              onMouseLeave={() => setTooltip(null)}
            >
              <div
                className="rounded-t transition-all duration-200 group-hover:opacity-100 opacity-70"
                style={{
                  height: `${Math.max(pct * 96, 4)}px`,
                  background: color,
                  boxShadow: `0 0 8px ${color}40`,
                }}
              />
            </div>
          )
        })}
      </div>
      {/* x-axis labels (first, middle, last) */}
      {weeks.length > 0 && (
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-text-tertiary">{weeks[0].week_label.split(' – ')[0]}</span>
          {weeks.length > 4 && (
            <span className="text-[10px] text-text-tertiary">
              {weeks[Math.floor(weeks.length / 2)].week_label.split(' – ')[0]}
            </span>
          )}
          <span className="text-[10px] text-text-tertiary">{weeks[weeks.length - 1].week_label.split(' – ')[1]}</span>
        </div>
      )}
      {/* tooltip */}
      {tooltip && (
        <div
          className="absolute -top-14 z-10 pointer-events-none"
          style={{ left: tooltip.x }}
        >
          <div className="card px-3 py-2 text-xs whitespace-nowrap" style={{
            background: 'rgba(20,22,35,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <p className="font-semibold text-text-primary">{tooltip.week.week_label}</p>
            <p style={{ color: scoreColor(tooltip.week.avg_score) }}>
              Score: {tooltip.week.avg_score}/100
            </p>
            <p className="text-text-tertiary">{tooltip.week.days_recorded} days recorded</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── component trend row ───────────────────────────────────────────────────────

function ComponentTrendRow({
  label, icon: Icon, iconColor, direction, delta, values,
}: {
  label: string
  icon: typeof Zap
  iconColor: string
  direction: TrendDirection
  delta: number
  values: number[]
}) {
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
        background: `${iconColor}15`,
        border: `1px solid ${iconColor}25`,
      }}>
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
      </div>
      <Sparkline values={values} color={trendColor(direction)} />
      <div className="flex items-center gap-1.5 ml-2 w-24 justify-end">
        <TrendIcon direction={direction} />
        <span className="text-xs font-medium" style={{ color: trendColor(direction) }}>
          {delta > 0 ? `+${delta}` : delta} pts
        </span>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export function TrendsView() {
  const [data, setData] = useState<BehavioralTrendsResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/behavioral-trends')
      .then((r) => r.json())
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-20 rounded-lg bg-surface-tertiary/30" />
          </div>
        ))}
      </div>
    )
  }

  if (!data?.has_enough_data) {
    return (
      <div className="card p-12 text-center space-y-3">
        <BarChart3 className="w-10 h-10 text-text-tertiary mx-auto" />
        <h3 className="text-base font-semibold text-text-primary">Not enough data yet</h3>
        <p className="text-sm text-text-tertiary max-w-md mx-auto">
          VitaMind needs at least 7 days of momentum data to show trends.
          Keep completing tasks and habits — your trend analysis will appear soon.
        </p>
      </div>
    )
  }

  const { weeks, overall_trend, overall_delta, component_trends, best_week, worst_week } = data

  const overallLabel = overall_trend === 'improving'
    ? `Momentum improved ${overall_delta} pts over 90 days`
    : overall_trend === 'declining'
    ? `Momentum declined ${Math.abs(overall_delta)} pts over 90 days`
    : 'Momentum has been stable over 90 days'

  return (
    <div className="space-y-6">
      {/* Overall trend banner */}
      <div className="card p-6 relative overflow-hidden" style={{
        background: overall_trend === 'improving'
          ? 'rgba(16,185,129,0.06)'
          : overall_trend === 'declining'
          ? 'rgba(239,68,68,0.06)'
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${trendColor(overall_trend)}25`,
      }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{
            background: `${trendColor(overall_trend)}15`,
            border: `1px solid ${trendColor(overall_trend)}30`,
          }}>
            <TrendIcon direction={overall_trend} size={22} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: trendColor(overall_trend) }}>
              90-Day Trend
            </p>
            <p className="text-lg font-bold text-text-primary mt-0.5">{overallLabel}</p>
            <p className="text-sm text-text-tertiary mt-0.5">
              Analysed {weeks.length} weeks of momentum data
            </p>
          </div>
        </div>
      </div>

      {/* Weekly score bar chart */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">Weekly Momentum Scores</h2>
        <WeekBars weeks={weeks} />
        <div className="flex gap-4 text-xs text-text-tertiary mt-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Strong (70+)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Moderate (40–69)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Low (&lt;40)</span>
        </div>
      </div>

      {/* Component trends */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-2">Component Trends</h2>
        <p className="text-xs text-text-tertiary mb-4">How each metric has changed from the first half to the second half of your 90-day window.</p>
        <ComponentTrendRow
          label="Task Velocity"
          icon={Zap}
          iconColor="#6366F1"
          direction={component_trends.task_velocity.direction}
          delta={component_trends.task_velocity.delta}
          values={weeks.map((w) => w.avg_task_velocity)}
        />
        <ComponentTrendRow
          label="Habit Consistency"
          icon={Heart}
          iconColor="#06B6D4"
          direction={component_trends.habit_consistency.direction}
          delta={component_trends.habit_consistency.delta}
          values={weeks.map((w) => w.avg_habit_consistency)}
        />
        <ComponentTrendRow
          label="Goal Trajectory"
          icon={Target}
          iconColor="#A855F7"
          direction={component_trends.goal_trajectory.direction}
          delta={component_trends.goal_trajectory.delta}
          values={weeks.map((w) => w.avg_goal_trajectory)}
        />
        <ComponentTrendRow
          label="Burnout Risk"
          icon={AlertTriangle}
          iconColor="#F59E0B"
          direction={component_trends.burnout_risk.direction}
          delta={component_trends.burnout_risk.delta}
          values={weeks.map((w) => w.avg_burnout_risk)}
        />
      </div>

      {/* Best / Worst week */}
      {(best_week || worst_week) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {best_week && (
            <div className="card p-5" style={{
              background: 'rgba(16,185,129,0.05)',
              border: '1px solid rgba(16,185,129,0.15)',
            }}>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Best Week</span>
              </div>
              <p className="text-sm font-semibold text-text-primary">{best_week.week_label}</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{best_week.avg_score}<span className="text-sm font-normal text-text-tertiary">/100</span></p>
              <p className="text-xs text-text-tertiary mt-1">{best_week.days_recorded} days recorded</p>
            </div>
          )}
          {worst_week && worst_week.week_start !== best_week?.week_start && (
            <div className="card p-5" style={{
              background: 'rgba(239,68,68,0.05)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-red-400" />
                <span className="text-xs font-medium text-red-400">Hardest Week</span>
              </div>
              <p className="text-sm font-semibold text-text-primary">{worst_week.week_label}</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{worst_week.avg_score}<span className="text-sm font-normal text-text-tertiary">/100</span></p>
              <p className="text-xs text-text-tertiary mt-1">{worst_week.days_recorded} days recorded</p>
            </div>
          )}
        </div>
      )}

      {/* Week detail table */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Weekly Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Week', 'Score', 'Tasks', 'Habits', 'Goals', 'Burnout', 'Days'].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 text-text-tertiary font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...weeks].reverse().map((w) => (
                <tr key={w.week_start} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="py-2 pr-4 text-text-secondary">{w.week_label}</td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: scoreColor(w.avg_score) }}>{w.avg_score}</td>
                  <td className="py-2 pr-4 text-text-secondary">{w.avg_task_velocity}</td>
                  <td className="py-2 pr-4 text-text-secondary">{w.avg_habit_consistency}</td>
                  <td className="py-2 pr-4 text-text-secondary">{w.avg_goal_trajectory}</td>
                  <td className="py-2 pr-4 text-text-secondary">{w.avg_burnout_risk}</td>
                  <td className="py-2 text-text-tertiary">{w.days_recorded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
