'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Crosshair, Play, Square, Plus, Minus, Clock, Zap, Trophy, AlertCircle, Check,
} from 'lucide-react'

interface FocusSuggestion {
  task_id: string
  title: string
  priority: string
  estimated_minutes: number | null
  reason: string
}

interface FocusBlock {
  id: string
  planned_tasks: string[]
  completed_tasks: string[]
  started_at: string
  ended_at: string | null
  duration_minutes: number
  focus_score: number | null
  interruptions: number
}

interface FocusStats {
  total_sessions: number
  avg_score: number
  total_minutes: number
  best_streak: number
}

export default function FocusPage() {
  const [stats, setStats] = useState<FocusStats | null>(null)
  const [active, setActive] = useState<FocusBlock | null>(null)
  const [recent, setRecent] = useState<FocusBlock[]>([])
  const [suggestions, setSuggestions] = useState<FocusSuggestion[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [duration, setDuration] = useState(25)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [interruptions, setInterruptions] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)

  useEffect(() => {
    fetch('/api/v1/focus')
      .then((res) => res.json())
      .then(({ data }) => {
        setStats(data?.stats ?? null)
        setActive(data?.active ?? null)
        setRecent(data?.recent ?? [])
        if (data?.active) {
          const elapsed = Math.floor((Date.now() - new Date(data.active.started_at).getTime()) / 1000)
          const remaining = data.active.duration_minutes * 60 - elapsed
          setTimeLeft(Math.max(0, remaining))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Timer countdown
  useEffect(() => {
    if (active && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 0
          }
          return t - 1
        })
      }, 1000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }
  }, [active, timeLeft > 0])

  async function handleSuggest() {
    setSuggesting(true)
    try {
      const res = await fetch('/api/v1/focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest', duration_minutes: duration }),
      })
      const { data } = await res.json()
      setSuggestions(data?.suggestions ?? [])
      setSelectedTasks(new Set((data?.suggestions ?? []).map((s: FocusSuggestion) => s.task_id)))
    } finally {
      setSuggesting(false)
    }
  }

  async function handleStart() {
    setStarting(true)
    try {
      const res = await fetch('/api/v1/focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          planned_tasks: Array.from(selectedTasks),
          duration_minutes: duration,
        }),
      })
      const { data } = await res.json()
      setActive(data?.block ?? null)
      setTimeLeft(duration * 60)
      setInterruptions(0)
    } finally {
      setStarting(false)
    }
  }

  const handleEnd = useCallback(async () => {
    if (!active) return
    const res = await fetch('/api/v1/focus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'end',
        block_id: active.id,
        completed_tasks: Array.from(selectedTasks),
        interruptions,
      }),
    })
    const { data } = await res.json()
    if (data?.block) {
      setRecent((prev) => [data.block, ...prev])
    }
    setActive(null)
    setTimeLeft(0)
    setSuggestions([])
    setSelectedTasks(new Set())
    if (timerRef.current) clearInterval(timerRef.current)
    // Refresh stats
    fetch('/api/v1/focus').then((r) => r.json()).then(({ data: d }) => setStats(d?.stats ?? null)).catch(() => {})
  }, [active, selectedTasks, interruptions])

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  function toggleTask(taskId: string) {
    setSelectedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Focus Mode</h1>
        {[1, 2].map((i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-24 rounded-lg bg-surface-tertiary/30" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Focus Mode</h1>
          <p className="text-xs text-text-tertiary mt-1">AI-guided deep work sessions</p>
        </div>
        <Crosshair className="w-5 h-5 text-text-tertiary" />
      </div>

      {/* Stats row */}
      {stats && stats.total_sessions > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Sessions', value: stats.total_sessions, icon: Zap, color: '#6366F1' },
            { label: 'Avg Score', value: `${stats.avg_score}%`, icon: Trophy, color: '#10B981' },
            { label: 'Total Focus', value: `${Math.round(stats.total_minutes / 60)}h`, icon: Clock, color: '#A855F7' },
            { label: 'Best Streak', value: `${stats.best_streak}d`, icon: Crosshair, color: '#06B6D4' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4 text-center" style={{ borderTop: `2px solid ${color}30` }}>
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
              <p className="text-lg font-bold text-text-primary">{value}</p>
              <p className="text-[10px] text-text-tertiary">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Active session */}
      {active ? (
        <div className="card p-8 text-center space-y-6" style={{
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.15)',
        }}>
          <div>
            <p className="text-xs text-primary-300 font-medium mb-2">Focus Session Active</p>
            <p className="text-5xl font-bold text-text-primary font-mono">{formatTime(timeLeft)}</p>
            {timeLeft === 0 && (
              <p className="text-xs text-emerald-400 mt-2">Time&apos;s up! Mark completed tasks and end session.</p>
            )}
          </div>

          {/* Task checkboxes */}
          {suggestions.length > 0 && (
            <div className="space-y-2 text-left max-w-sm mx-auto">
              <p className="text-xs text-text-tertiary">Mark completed:</p>
              {suggestions.map((s) => (
                <label key={s.task_id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTasks.has(s.task_id)}
                    onChange={() => toggleTask(s.task_id)}
                    className="rounded border-white/20"
                  />
                  <span className="text-sm text-text-secondary">{s.title}</span>
                </label>
              ))}
            </div>
          )}

          {/* Interruptions */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs text-text-tertiary">Interruptions:</span>
            <button onClick={() => setInterruptions((i) => Math.max(0, i - 1))} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <Minus className="w-3 h-3 text-text-tertiary" />
            </button>
            <span className="text-sm font-bold text-text-primary w-6 text-center">{interruptions}</span>
            <button onClick={() => setInterruptions((i) => i + 1)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <Plus className="w-3 h-3 text-text-tertiary" />
            </button>
          </div>

          <button
            onClick={handleEnd}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: 'rgba(239,68,68,0.8)' }}
          >
            <Square className="w-4 h-4 inline mr-2" />
            End Session
          </button>
        </div>
      ) : (
        /* Setup new session */
        <div className="card p-6 space-y-5">
          <h2 className="text-sm font-semibold text-text-primary">Start a Focus Block</h2>

          {/* Duration selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-tertiary">Duration:</span>
            {[15, 25, 45, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: duration === d ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${duration === d ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: duration === d ? '#C7D2FE' : 'rgba(255,255,255,0.5)',
                }}
              >
                {d}m
              </button>
            ))}
          </div>

          {/* Suggest button */}
          <button
            onClick={handleSuggest}
            disabled={suggesting}
            className="text-xs font-medium px-4 py-2 rounded-lg transition-colors"
            style={{
              background: 'rgba(168,85,247,0.12)',
              border: '1px solid rgba(168,85,247,0.25)',
              color: '#D8B4FE',
            }}
          >
            {suggesting ? 'Finding best tasks...' : 'AI: Suggest tasks for this block'}
          </button>

          {/* Suggested tasks */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-text-tertiary">Suggested tasks:</p>
              {suggestions.map((s) => (
                <label key={s.task_id} className="card p-3 flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTasks.has(s.task_id)}
                    onChange={() => toggleTask(s.task_id)}
                    className="mt-0.5 rounded border-white/20"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{s.title}</p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">{s.reason}</p>
                  </div>
                  {s.estimated_minutes && (
                    <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                      <Clock className="w-3 h-3" />{s.estimated_minutes}m
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #A855F7)',
              opacity: starting ? 0.7 : 1,
            }}
          >
            <Play className="w-4 h-4 inline mr-2" />
            {starting ? 'Starting...' : `Start ${duration}-minute Focus Block`}
          </button>
        </div>
      )}

      {/* Recent sessions */}
      {recent.filter((b) => b.ended_at).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">Recent Sessions</h2>
          {recent.filter((b) => b.ended_at).slice(0, 5).map((block) => (
            <div key={block.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{
                  background: (block.focus_score ?? 0) >= 70
                    ? 'rgba(16,185,129,0.12)' : (block.focus_score ?? 0) >= 40
                    ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                }}>
                  {(block.focus_score ?? 0) >= 70 ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {block.duration_minutes}min session
                  </p>
                  <p className="text-[10px] text-text-tertiary">
                    {new Date(block.started_at).toLocaleDateString()} &middot; {block.completed_tasks.length}/{block.planned_tasks.length} tasks &middot; {block.interruptions} interruptions
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{
                  color: (block.focus_score ?? 0) >= 70 ? '#10B981' : (block.focus_score ?? 0) >= 40 ? '#F59E0B' : '#EF4444',
                }}>
                  {block.focus_score ?? 0}
                </p>
                <p className="text-[10px] text-text-tertiary">score</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
