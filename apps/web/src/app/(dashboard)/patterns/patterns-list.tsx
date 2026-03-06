'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles, Key, Calendar, Clock, Link2, X, RefreshCw, BarChart3,
} from 'lucide-react'

interface PatternInsight {
  id: string
  type: string
  title: string
  description: string
  confidence: number
  computed_at: string
}

interface PatternsData {
  insights: PatternInsight[]
  keystone_habit: { title: string; impact_score: number } | null
  has_enough_data: boolean
}

const TYPE_ICON: Record<string, typeof Sparkles> = {
  habit_task_correlation: Link2,
  habit_pair: Link2,
  keystone_habit: Key,
  day_pattern: Calendar,
  time_pattern: Clock,
}

const TYPE_COLOR: Record<string, string> = {
  habit_task_correlation: '#6366F1',
  habit_pair: '#A855F7',
  keystone_habit: '#F59E0B',
  day_pattern: '#10B981',
  time_pattern: '#06B6D4',
}

export function PatternsList() {
  const [data, setData] = useState<PatternsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetch('/api/v1/patterns')
      .then((res) => res.json())
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/v1/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' }),
      })
      const { data: newData } = await res.json()
      setData(newData)
    } finally {
      setRefreshing(false)
    }
  }

  async function handleDismiss(insightId: string) {
    await fetch('/api/v1/patterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', insight_id: insightId }),
    })
    setData((prev) => prev ? {
      ...prev,
      insights: prev.insights.filter((i) => i.id !== insightId),
    } : null)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-16 rounded-lg bg-surface-tertiary/30" />
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
          VitaMind needs at least 30 days of task and habit data to discover patterns.
          Keep using the app and check back soon.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Keystone habit highlight */}
      {data.keystone_habit && (
        <div className="card p-6 relative overflow-hidden" style={{
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.15)',
        }}>
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 pointer-events-none" style={{
            background: 'radial-gradient(circle, rgba(245,158,11,0.4), transparent 70%)',
            filter: 'blur(30px)',
          }} />
          <div className="flex items-center gap-3 relative">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.3)',
            }}>
              <Key className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-400">Keystone Habit</p>
              <p className="text-lg font-bold text-text-primary">{data.keystone_habit.title}</p>
              <p className="text-xs text-text-tertiary mt-0.5">
                This habit has the strongest impact on your overall productivity.
                Confidence: {Math.round(data.keystone_habit.impact_score * 100)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Analyzing...' : 'Recompute patterns'}
        </button>
      </div>

      {/* Pattern cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.insights.map((insight) => {
          const Icon = TYPE_ICON[insight.type] ?? Sparkles
          const color = TYPE_COLOR[insight.type] ?? '#6366F1'

          return (
            <div key={insight.id} className="card p-5 relative group">
              <button
                onClick={() => handleDismiss(insight.id)}
                className="absolute top-3 right-3 p-1 text-text-tertiary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Dismiss insight"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                  background: `${color}15`,
                  border: `1px solid ${color}30`,
                }}>
                  <Icon className="w-4.5 h-4.5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary">{insight.title}</h3>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">{insight.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <div className="h-1 rounded-full" style={{
                        width: `${Math.round(insight.confidence * 60)}px`,
                        background: color,
                        opacity: 0.6,
                      }} />
                      <span className="text-[10px] text-text-tertiary">{Math.round(insight.confidence * 100)}% confidence</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {data.insights.length === 0 && (
        <div className="card p-8 text-center text-text-tertiary text-sm">
          No patterns found yet. Keep completing tasks and habits to discover correlations.
        </div>
      )}
    </div>
  )
}
