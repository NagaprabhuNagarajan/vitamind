'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Flame } from 'lucide-react'
import type { HabitWithStreak } from '@/features/habits/types'

interface HabitCheckinsProps {
  habits: HabitWithStreak[]
}

export function HabitCheckins({ habits }: HabitCheckinsProps) {
  const [localHabits, setLocalHabits] = useState(habits)
  const [loading, setLoading] = useState<string | null>(null)

  async function handleCheck(habitId: string, alreadyDone: boolean) {
    if (alreadyDone) return
    setLoading(habitId)
    try {
      await fetch('/api/v1/habit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: habitId, status: 'completed' }),
      })
      setLocalHabits((prev) =>
        prev.map((h) =>
          h.habit.id === habitId
            ? { ...h, streak: h.streak + 1, todayLog: { ...h.todayLog, status: 'completed' } as never }
            : h,
        ),
      )
    } finally {
      setLoading(null)
    }
  }

  if (localHabits.length === 0) return null

  return (
    <div className="card">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-text-primary">Today&apos;s habits</h2>
      </div>
      <ul className="divide-y divide-border">
        {localHabits.map(({ habit, streak, todayLog }) => {
          const done = todayLog?.status === 'completed'
          return (
            <li key={habit.id} className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => handleCheck(habit.id, done)}
                disabled={done || loading === habit.id}
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200',
                  done
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-border hover:border-secondary hover:bg-secondary/5',
                )}
                aria-label={done ? `${habit.title} done` : `Mark ${habit.title} done`}
              >
                {done && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className={cn('flex-1 text-sm', done ? 'text-text-tertiary line-through' : 'text-text-primary')}>
                {habit.title}
              </span>
              {streak > 0 && (
                <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                  <Flame className="w-3 h-3" />
                  {streak}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
