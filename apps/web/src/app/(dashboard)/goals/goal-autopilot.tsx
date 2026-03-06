'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Rocket, ToggleLeft, ToggleRight, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'

interface AutopilotStatus {
  goal_id: string
  goal_title: string
  enabled: boolean
  progress: number
  weeks_remaining: number
  on_track: boolean
  current_plan: {
    week_number: number
    tasks_generated: { title: string; due_date: string }[]
  } | null
}

export function GoalAutopilot() {
  const [goals, setGoals] = useState<AutopilotStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/v1/goal-autopilot')
      .then((res) => res.json())
      .then(({ data }) => setGoals(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(goalId: string, currentlyEnabled: boolean) {
    setToggling(goalId)
    try {
      await fetch('/api/v1/goal-autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: currentlyEnabled ? 'disable' : 'enable', goal_id: goalId }),
      })
      // Re-fetch
      const res = await fetch('/api/v1/goal-autopilot')
      const { data } = await res.json()
      setGoals(data ?? [])
      router.refresh()
    } finally {
      setToggling(null)
    }
  }

  async function handleAdjust(goalId: string) {
    setToggling(goalId)
    try {
      await fetch('/api/v1/goal-autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adjust', goal_id: goalId }),
      })
      const res = await fetch('/api/v1/goal-autopilot')
      const { data } = await res.json()
      setGoals(data ?? [])
      router.refresh()
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-16 rounded-lg bg-surface-tertiary/30" />
      </div>
    )
  }

  if (goals.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Rocket className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-text-primary">Goal Autopilot</h2>
      </div>

      {goals.map((goal) => (
        <div key={goal.goal_id} className="card p-4" style={{
          background: goal.enabled ? 'rgba(99,102,241,0.04)' : undefined,
          border: goal.enabled ? '1px solid rgba(99,102,241,0.12)' : undefined,
        }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-text-primary truncate">{goal.goal_title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-text-tertiary">{goal.progress}% done</span>
                {goal.weeks_remaining > 0 && (
                  <span className="text-[10px] text-text-tertiary">· {goal.weeks_remaining}w left</span>
                )}
                {goal.enabled && (
                  <span className="flex items-center gap-0.5 text-[10px]">
                    {goal.on_track ? (
                      <><CheckCircle className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">On track</span></>
                    ) : (
                      <><AlertTriangle className="w-3 h-3 text-amber-400" /><span className="text-amber-400">Behind</span></>
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {goal.enabled && (
                <button
                  onClick={() => handleAdjust(goal.goal_id)}
                  disabled={toggling === goal.goal_id}
                  className="p-1.5 text-text-tertiary hover:text-indigo-400 transition-colors"
                  aria-label="Regenerate plan"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => handleToggle(goal.goal_id, goal.enabled)}
                disabled={toggling === goal.goal_id}
                className="text-text-tertiary hover:text-text-primary transition-colors"
                aria-label={goal.enabled ? 'Disable autopilot' : 'Enable autopilot'}
              >
                {goal.enabled ? (
                  <ToggleRight className="w-6 h-6 text-indigo-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {goal.enabled && goal.current_plan && (
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] text-text-tertiary mb-1.5">Week {goal.current_plan.week_number} tasks:</p>
              <div className="space-y-1">
                {goal.current_plan.tasks_generated.slice(0, 3).map((task, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary truncate">{task.title}</span>
                    <span className="text-[10px] text-text-tertiary flex-shrink-0 ml-2">{task.due_date?.slice(5)}</span>
                  </div>
                ))}
                {goal.current_plan.tasks_generated.length > 3 && (
                  <span className="text-[10px] text-text-tertiary">+{goal.current_plan.tasks_generated.length - 3} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
