'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layers, Play, Trash2, Plus, Sparkles, CheckCircle2 } from 'lucide-react'

interface StackHabit {
  id: string
  title: string
  completed_today: boolean
}

interface Stack {
  id: string
  name: string
  habits: StackHabit[]
  suggested_time: string | null
  completion_rate: number
}

interface StackSuggestion {
  habit_titles: string[]
  habit_ids: string[]
  suggested_name: string
  suggested_time: string
  reason: string
}

interface StacksData {
  stacks: Stack[]
  suggestions: StackSuggestion[]
}

export function HabitStacks() {
  const [data, setData] = useState<StacksData | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/v1/habit-stacks')
      .then((res) => res.json())
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleCompleteStack(stackId: string) {
    setCompleting(stackId)
    try {
      await fetch('/api/v1/habit-stacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', stack_id: stackId }),
      })
      router.refresh()
      // Re-fetch stacks to update UI
      const res = await fetch('/api/v1/habit-stacks')
      const { data: newData } = await res.json()
      setData(newData)
    } finally {
      setCompleting(null)
    }
  }

  async function handleAcceptSuggestion(suggestion: StackSuggestion) {
    try {
      await fetch('/api/v1/habit-stacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: suggestion.suggested_name,
          habit_ids: suggestion.habit_ids,
          suggested_time: suggestion.suggested_time,
        }),
      })
      const res = await fetch('/api/v1/habit-stacks')
      const { data: newData } = await res.json()
      setData(newData)
    } catch {}
  }

  async function handleDeleteStack(stackId: string) {
    try {
      await fetch('/api/v1/habit-stacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', stack_id: stackId }),
      })
      setData((prev) => prev ? { ...prev, stacks: prev.stacks.filter((s) => s.id !== stackId) } : null)
    } catch {}
  }

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-16 rounded-lg bg-surface-tertiary/30" />
      </div>
    )
  }

  if (!data || (data.stacks.length === 0 && data.suggestions.length === 0)) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-purple-400" />
        <h2 className="text-sm font-semibold text-text-primary">Habit Stacks</h2>
      </div>

      {/* Active stacks */}
      {data.stacks.map((stack) => {
        const allDone = stack.habits.every((h) => h.completed_today)
        return (
          <div key={stack.id} className="card p-4" style={{
            background: allDone ? 'rgba(6,182,212,0.06)' : undefined,
            border: allDone ? '1px solid rgba(6,182,212,0.15)' : undefined,
          }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-text-primary">{stack.name}</h3>
                <p className="text-[10px] text-text-tertiary">
                  {stack.suggested_time && `Best at ${stack.suggested_time} · `}
                  {stack.completion_rate}% completion rate
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {!allDone && (
                  <button
                    onClick={() => handleCompleteStack(stack.id)}
                    disabled={completing === stack.id}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    style={{
                      background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(99,102,241,0.2))',
                      border: '1px solid rgba(6,182,212,0.3)',
                      color: '#22D3EE',
                    }}
                  >
                    <Play className="w-3 h-3" />
                    {completing === stack.id ? 'Completing...' : 'Start stack'}
                  </button>
                )}
                <button
                  onClick={() => handleDeleteStack(stack.id)}
                  className="p-1.5 text-text-tertiary hover:text-red-400 transition-colors"
                  aria-label="Delete stack"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {stack.habits.map((habit, i) => (
                <div key={habit.id} className="flex items-center gap-2 text-xs">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium" style={{
                    background: habit.completed_today ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)',
                    color: habit.completed_today ? '#22D3EE' : 'rgba(255,255,255,0.4)',
                  }}>
                    {habit.completed_today ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                  </span>
                  <span className={habit.completed_today ? 'text-text-tertiary line-through' : 'text-text-secondary'}>
                    {habit.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Suggestions */}
      {data.suggestions.map((suggestion, i) => (
        <div key={i} className="card p-4" style={{
          background: 'rgba(168,85,247,0.04)',
          border: '1px solid rgba(168,85,247,0.12)',
        }}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-medium text-purple-400">Suggested Stack</span>
            </div>
            <button
              onClick={() => handleAcceptSuggestion(suggestion)}
              className="text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
              style={{
                background: 'rgba(168,85,247,0.15)',
                border: '1px solid rgba(168,85,247,0.3)',
                color: '#C084FC',
              }}
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">{suggestion.suggested_name}</p>
          <p className="text-xs text-text-tertiary mb-1.5">{suggestion.habit_titles.join(' → ')} at {suggestion.suggested_time}</p>
          <p className="text-xs text-text-tertiary italic">{suggestion.reason}</p>
        </div>
      ))}
    </div>
  )
}
