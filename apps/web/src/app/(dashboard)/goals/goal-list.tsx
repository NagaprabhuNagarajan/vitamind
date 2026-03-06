'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { cn, formatDate } from '@/lib/utils'
import { Target, Trash2, CheckCircle2, Trophy, Rocket, ToggleLeft, ToggleRight } from 'lucide-react'
import type { Goal } from '@/lib/types'

// ─── Complete confirmation dialog ─────────────────────────────────────────────

function CompleteDialog({ goal, onConfirm, onCancel }: {
  goal: Goal
  onConfirm: () => void
  onCancel: () => void
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden p-6 space-y-5 animate-scale-in"
        style={{
          background: 'rgba(15,17,23,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.8)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top shimmer — gold */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{
          background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.6), transparent)',
        }} />

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{
            background: 'rgba(251,191,36,0.12)',
            border: '1px solid rgba(251,191,36,0.3)',
            boxShadow: '0 0 24px rgba(251,191,36,0.15)',
          }}>
            <Trophy className="w-7 h-7 text-amber-400" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-1.5">
          <h2 className="text-base font-semibold text-text-primary">Mark goal as complete?</h2>
          <p className="text-sm text-text-tertiary leading-relaxed">
            "{goal.title}" will be marked as achieved. This cannot be undone from the progress slider.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.9), rgba(245,158,11,0.9))',
              border: '1px solid rgba(251,191,36,0.4)',
              boxShadow: '0 0 20px rgba(251,191,36,0.25)',
            }}
          >
            Yes, complete it!
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function GoalList({ initialGoals }: { initialGoals: Goal[] }) {
  const [goals, setGoals] = useState(initialGoals)
  const [acting, setActing] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [pendingComplete, setPendingComplete] = useState<{ goal: Goal; progress: number } | null>(null)
  const [togglingAutopilot, setTogglingAutopilot] = useState<string | null>(null)
  const router = useRouter()

  // Track slider refs so we can reset value on cancel
  const sliderRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const active = goals.filter((g) => !g.is_completed)
  const completed = goals.filter((g) => g.is_completed)
  const visible = showCompleted ? goals : active

  async function applyProgress(id: string, progress: number) {
    const res = await fetch(`/api/v1/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress }),
    })
    const { data } = await res.json()
    if (data) setGoals(prev => prev.map(g => g.id === id ? data : g))
    router.refresh()
  }

  function handleSliderChange(goal: Goal, value: number) {
    if (value === 100) {
      setPendingComplete({ goal, progress: 100 })
    } else {
      applyProgress(goal.id, value)
    }
  }

  function handleConfirmComplete() {
    if (!pendingComplete) return
    const { goal, progress } = pendingComplete
    setPendingComplete(null)
    applyProgress(goal.id, progress)
  }

  function handleCancelComplete() {
    if (!pendingComplete) return
    // Reset slider back to current goal progress
    const slider = sliderRefs.current.get(pendingComplete.goal.id)
    if (slider) slider.value = String(pendingComplete.goal.progress)
    setPendingComplete(null)
  }

  async function handleDelete(id: string) {
    setActing(id)
    try {
      await fetch(`/api/v1/goals/${id}`, { method: 'DELETE' })
      setGoals(prev => prev.filter(g => g.id !== id))
      router.refresh()
    } finally {
      setActing(null)
    }
  }

  async function handleToggleAutopilot(goalId: string, currentlyEnabled: boolean) {
    setTogglingAutopilot(goalId)
    try {
      await fetch('/api/v1/goal-autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: currentlyEnabled ? 'disable' : 'enable', goal_id: goalId }),
      })
      setGoals(prev => prev.map(g =>
        g.id === goalId ? { ...g, autopilot_enabled: !currentlyEnabled } : g
      ))
      router.refresh()
    } finally {
      setTogglingAutopilot(null)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {completed.length > 0 && (
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            {showCompleted ? 'Hide' : 'Show'} {completed.length} completed goal{completed.length !== 1 ? 's' : ''}
          </button>
        )}

        {visible.length === 0 ? (
          <div className="card p-12 text-center text-text-tertiary text-sm">
            No goals yet. Create your first goal to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((goal) => (
              <div key={goal.id} className={cn('card p-5 group', goal.is_completed && 'opacity-60')}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    goal.is_completed ? 'bg-green-100' : 'bg-secondary/10',
                  )}>
                    {goal.is_completed
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : <Target className="w-4 h-4 text-secondary" />
                    }
                  </div>

                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={cn('font-medium text-text-primary', goal.is_completed && 'line-through text-text-tertiary')}>
                          {goal.title}
                        </h3>
                        {goal.target_date && (
                          <p className="text-xs text-text-tertiary mt-0.5">
                            Target: {formatDate(goal.target_date)}
                          </p>
                        )}
                        {goal.description && (
                          <p className="text-sm text-text-secondary mt-1">{goal.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!goal.is_completed && (
                          <button
                            onClick={() => handleToggleAutopilot(goal.id, !!(goal as any).autopilot_enabled)}
                            disabled={togglingAutopilot === goal.id}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                            style={{
                              background: (goal as any).autopilot_enabled ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${(goal as any).autopilot_enabled ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
                              color: (goal as any).autopilot_enabled ? '#818cf8' : undefined,
                            }}
                            title={(goal as any).autopilot_enabled ? 'Disable Autopilot' : 'Enable Autopilot'}
                          >
                            <Rocket className="w-3 h-3" />
                            {(goal as any).autopilot_enabled ? (
                              <ToggleRight className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-text-tertiary" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(goal.id)}
                          disabled={acting === goal.id}
                          className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-tertiary">Progress</span>
                        <span className="text-xs font-medium text-text-primary">{goal.progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-tertiary overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            goal.is_completed ? 'bg-green-500' : 'bg-secondary',
                          )}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      {!goal.is_completed && (
                        <input
                          ref={el => {
                            if (el) sliderRefs.current.set(goal.id, el)
                            else sliderRefs.current.delete(goal.id)
                          }}
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          defaultValue={goal.progress}
                          onMouseUp={e => handleSliderChange(goal, Number(e.currentTarget.value))}
                          onTouchEnd={e => handleSliderChange(goal, Number(e.currentTarget.value))}
                          className="w-full accent-secondary h-1 cursor-pointer"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingComplete && (
        <CompleteDialog
          goal={pendingComplete.goal}
          onConfirm={handleConfirmComplete}
          onCancel={handleCancelComplete}
        />
      )}
    </>
  )
}
