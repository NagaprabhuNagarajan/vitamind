'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Flame, Trash2, CheckCircle2, Repeat2 } from 'lucide-react'
import type { HabitWithStreak } from '@/features/habits/types'

const FREQ_LABEL: Record<string, string> = {
  daily: 'Every day',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  weekly: 'Weekly',
}

// ─── Confirmation dialog ───────────────────────────────────────────────────────

function ConfirmDialog({ habitTitle, onConfirm, onCancel }: {
  habitTitle: string
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
        {/* Top shimmer — cyan */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{
          background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.6), transparent)',
        }} />

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
            background: 'rgba(6,182,212,0.12)',
            border: '1px solid rgba(6,182,212,0.25)',
            boxShadow: '0 0 20px rgba(6,182,212,0.12)',
          }}>
            <Repeat2 className="w-6 h-6 text-cyan-400" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-1.5">
          <h2 className="text-base font-semibold text-text-primary">Mark habit done?</h2>
          <p className="text-sm text-text-tertiary leading-relaxed">
            Log "{habitTitle}" as completed for today.
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
              background: 'linear-gradient(135deg, rgba(6,182,212,0.85), rgba(8,145,178,0.85))',
              border: '1px solid rgba(6,182,212,0.35)',
              boxShadow: '0 0 20px rgba(6,182,212,0.2)',
            }}
          >
            Mark done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function HabitGrid({ initialHabits }: { initialHabits: HabitWithStreak[] }) {
  const [habits, setHabits] = useState(initialHabits)
  const [logging, setLogging] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [pendingHabitId, setPendingHabitId] = useState<string | null>(null)
  const router = useRouter()

  const pendingHabit = pendingHabitId ? habits.find(h => h.habit.id === pendingHabitId) : null

  async function confirmCheck(habitId: string) {
    setPendingHabitId(null)
    setLogging(habitId)
    try {
      await fetch('/api/v1/habit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: habitId, status: 'completed' }),
      })
      setHabits(prev =>
        prev.map(h =>
          h.habit.id === habitId
            ? { ...h, streak: h.streak + 1, todayLog: { ...h.todayLog, status: 'completed' } as never }
            : h,
        ),
      )
      router.refresh()
    } finally {
      setLogging(null)
    }
  }

  async function handleDelete(habitId: string) {
    setDeleting(habitId)
    try {
      await fetch(`/api/v1/habits/${habitId}`, { method: 'DELETE' })
      setHabits(prev => prev.filter(h => h.habit.id !== habitId))
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  if (habits.length === 0) {
    return (
      <div className="card p-12 text-center text-text-tertiary text-sm">
        No habits yet. Build your first habit to get started.
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {habits.map(({ habit, streak, todayLog }) => {
          const done = todayLog?.status === 'completed'
          return (
            <div
              key={habit.id}
              className="relative rounded-2xl overflow-hidden p-5 group transition-all duration-200"
              style={{
                background: done
                  ? 'rgba(6,182,212,0.07)'
                  : 'rgba(15,17,23,0.7)',
                border: done
                  ? '1px solid rgba(6,182,212,0.2)'
                  : '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Done shimmer top line */}
              {done && (
                <div className="absolute top-0 left-0 right-0 h-px" style={{
                  background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.5), transparent)',
                }} />
              )}

              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-text-primary">
                    {habit.title}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {FREQ_LABEL[habit.frequency]}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(habit.id)}
                  disabled={deleting === habit.id}
                  className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-red-400 transition-all flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Streak */}
              {streak > 0 && (
                <div className="flex items-center gap-1 mb-4">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-medium text-orange-400">{streak} day streak</span>
                </div>
              )}

              {/* Check-in button */}
              {done ? (
                <div
                  className="w-full py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(6,182,212,0.15)',
                    border: '1px solid rgba(6,182,212,0.25)',
                    color: '#22D3EE',
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Done today
                </div>
              ) : (
                <button
                  onClick={() => setPendingHabitId(habit.id)}
                  disabled={logging === habit.id}
                  className="w-full py-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(6,182,212,0.15)'
                    e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'
                    e.currentTarget.style.color = '#22D3EE'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                  }}
                >
                  {logging === habit.id ? 'Logging…' : 'Mark done'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {pendingHabit && (
        <ConfirmDialog
          habitTitle={pendingHabit.habit.title}
          onConfirm={() => confirmCheck(pendingHabit.habit.id)}
          onCancel={() => setPendingHabitId(null)}
        />
      )}
    </>
  )
}
