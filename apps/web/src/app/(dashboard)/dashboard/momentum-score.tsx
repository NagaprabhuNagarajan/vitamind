'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MomentumData {
  current: {
    score: number
    task_velocity: number
    habit_consistency: number
    goal_trajectory: number
    overdue_pressure: number
    burnout_risk: number
  } | null
  history: { date: string; score: number }[]
  trend: { direction: 'up' | 'down' | 'stable'; delta: number }
}

export function MomentumScore() {
  const [data, setData] = useState<MomentumData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/momentum')
      .then((res) => res.json())
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-24 rounded-lg bg-surface-tertiary/30" />
      </div>
    )
  }

  if (!data?.current) return null

  const { current, trend, history } = data
  const score = current.score
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444'
  const gradient = score >= 70
    ? 'linear-gradient(135deg, #10B981, #34D399)'
    : score >= 40
      ? 'linear-gradient(135deg, #F59E0B, #FBBF24)'
      : 'linear-gradient(135deg, #EF4444, #F87171)'

  const TrendIcon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus

  const components = [
    { label: 'Task Velocity', value: current.task_velocity, color: '#6366F1' },
    { label: 'Habit Consistency', value: current.habit_consistency, color: '#A855F7' },
    { label: 'Goal Trajectory', value: current.goal_trajectory, color: '#06B6D4' },
    { label: 'Overdue Pressure', value: current.overdue_pressure, color: '#F97316', inverted: true },
  ]

  // Sparkline from last 14 days of history
  const recent = history.slice(-14)
  const maxScore = Math.max(...recent.map((h) => h.score), 1)
  const minScore = Math.min(...recent.map((h) => h.score), 0)
  const range = Math.max(maxScore - minScore, 1)

  return (
    <div className="card p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 pointer-events-none" style={{
        background: `radial-gradient(circle, ${color}40, transparent 70%)`,
        filter: 'blur(40px)',
      }} />

      <div className="flex items-start justify-between mb-4 relative">
        <div className="flex items-center gap-2">
          <Activity aria-hidden="true" className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm font-medium text-text-secondary">Life Momentum</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendIcon aria-hidden="true" className={cn('w-3.5 h-3.5', trend.direction === 'up' ? 'text-green-400' : trend.direction === 'down' ? 'text-red-400' : 'text-text-tertiary')} />
          <span className={cn('text-xs font-medium', trend.direction === 'up' ? 'text-green-400' : trend.direction === 'down' ? 'text-red-400' : 'text-text-tertiary')}>
            {trend.delta > 0 ? '+' : ''}{trend.delta} vs last week
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6 relative">
        {/* Score circle */}
        <div className="relative flex-shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96" aria-label={`Momentum score: ${score}`}>
            <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle
              cx="48" cy="48" r="40"
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 251.2} 251.2`}
              transform="rotate(-90 48 48)"
              style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold" style={{
              background: gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {score}
            </span>
          </div>
        </div>

        {/* Component bars */}
        <div className="flex-1 space-y-2.5">
          {components.map(({ label, value, color: barColor, inverted }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-text-tertiary">{label}</span>
                <span className="text-[11px] font-medium text-text-secondary">{value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${inverted ? 100 - value : value}%`,
                    background: barColor,
                    opacity: 0.8,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sparkline */}
      {recent.length > 2 && (
        <div className="mt-4 pt-3 relative" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <svg width="100%" height="32" viewBox={`0 0 ${recent.length - 1} ${range}`} preserveAspectRatio="none" aria-hidden="true">
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinejoin="round"
              opacity="0.6"
              points={recent.map((h, i) => `${i},${maxScore - h.score}`).join(' ')}
            />
          </svg>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-text-tertiary">{recent[0]?.date?.slice(5)}</span>
            <span className="text-[10px] text-text-tertiary">Today</span>
          </div>
        </div>
      )}

      {/* Burnout warning */}
      {current.burnout_risk > 60 && (
        <div className="mt-3 p-2.5 rounded-lg text-xs" style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#F87171',
        }}>
          Burnout risk is elevated ({current.burnout_risk}/100). Consider a lighter day.
        </div>
      )}
    </div>
  )
}
