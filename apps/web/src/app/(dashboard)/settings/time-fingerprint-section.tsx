'use client'

import { useState, useEffect } from 'react'
import { Clock, Sun, Moon, BarChart3, RefreshCw } from 'lucide-react'

interface ProductivityProfile {
  peak_hours: number[]
  low_hours: number[]
  best_day: string
  worst_day: string
  habit_morning_rate: number
  habit_evening_rate: number
  avg_tasks_per_day: number
  most_productive_window: string
  computed_at: string
}

function formatHour(h: number): string {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

export function TimeFingerprintSection() {
  const [profile, setProfile] = useState<ProductivityProfile | null>(null)
  const [hasEnoughData, setHasEnoughData] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/time-fingerprint')
      .then((res) => res.json())
      .then(({ data }) => {
        setProfile(data?.profile ?? null)
        setHasEnoughData(data?.has_enough_data ?? false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="card p-6 space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="icon-box" style={{
          background: 'rgba(6,182,212,0.12)',
          border: '1px solid rgba(6,182,212,0.25)',
        }}>
          <Clock className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">Time Fingerprint</h2>
          <p className="text-xs text-text-tertiary">Your personal productivity patterns, learned from your data</p>
        </div>
      </div>

      <div className="divider" />

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-48 rounded bg-surface-tertiary/30" />
          <div className="h-4 w-36 rounded bg-surface-tertiary/30" />
        </div>
      ) : !hasEnoughData && !profile ? (
        <div className="text-center py-6 space-y-2">
          <BarChart3 className="w-8 h-8 text-text-tertiary mx-auto" />
          <p className="text-sm text-text-secondary">Not enough data yet</p>
          <p className="text-xs text-text-tertiary max-w-sm mx-auto">
            Complete at least 5 tasks over 14 days for VitaMind to learn your productivity patterns.
          </p>
        </div>
      ) : profile?.peak_hours ? (
        <div className="space-y-4">
          {/* Peak hours */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Peak Hours
            </p>
            <div className="flex gap-2">
              {profile.peak_hours.map((h) => (
                <span key={h} className="px-2.5 py-1 rounded-md text-xs font-medium"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                  {formatHour(h)}
                </span>
              ))}
            </div>
          </div>

          {/* Most productive window */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-text-secondary">Best 2-Hour Window</p>
            <p className="text-sm font-semibold" style={{
              background: 'linear-gradient(135deg, #6366F1, #A855F7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {profile.most_productive_window}
            </p>
          </div>

          {/* Best/worst days */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-text-tertiary">Best Day</p>
              <p className="text-sm font-medium text-emerald-400">{profile.best_day}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-text-tertiary">Least Productive Day</p>
              <p className="text-sm font-medium text-red-400">{profile.worst_day}</p>
            </div>
          </div>

          {/* Morning vs evening habits */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-text-secondary">Habit Completion Pattern</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-text-secondary">Morning {Math.round(profile.habit_morning_rate * 100)}%</span>
              </div>
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full flex">
                  <div className="h-full bg-amber-400/70" style={{ width: `${profile.habit_morning_rate * 100}%` }} />
                  <div className="h-full bg-indigo-400/70" style={{ width: `${profile.habit_evening_rate * 100}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs text-text-secondary">Evening {Math.round(profile.habit_evening_rate * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Avg tasks */}
          <div className="space-y-1">
            <p className="text-xs text-text-tertiary">Average Tasks Per Day</p>
            <p className="text-sm font-medium text-text-primary">{profile.avg_tasks_per_day}</p>
          </div>

          {/* Computed timestamp */}
          <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
            <RefreshCw className="w-3 h-3" />
            Last computed {new Date(profile.computed_at).toLocaleDateString()}
          </div>
        </div>
      ) : null}
    </section>
  )
}
