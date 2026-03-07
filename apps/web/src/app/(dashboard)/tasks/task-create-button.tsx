'use client'

import { useState, useTransition, useEffect } from 'react'
import { Plus, X, Repeat, Sparkles } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { Goal } from '@/lib/types'

interface TimeSlot {
  time: string   // HH:MM
  label: string  // "9:00 AM"
  reason: string
}

interface TaskCreateButtonProps {
  goals: Goal[]
}

export function TaskCreateButton({ goals }: TaskCreateButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [isRecurring, setIsRecurring] = useState(false)
  const [dueTime, setDueTime] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [suggestingTime, setSuggestingTime] = useState(false)

  // Close dialog on Escape key for keyboard accessibility
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  async function suggestTime(title: string, priority: string) {
    if (!title.trim()) return
    setSuggestingTime(true)
    setTimeSlots([])
    try {
      const res = await fetch('/api/v1/smart-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, date: dueDate || undefined }),
      })
      const { data } = await res.json()
      if (data?.slots) setTimeSlots(data.slots)
    } catch {
      // silently fail — user can still type manually
    } finally {
      setSuggestingTime(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      title: formData.get('title'),
      priority: formData.get('priority'),
      due_date: (formData.get('due_date') as string) || null,
      due_time: dueTime || null,   // controlled — may have been set via smart schedule slot
      goal_id: formData.get('goal_id') || null,
    }

    // Attach recurrence fields when the repeat toggle is on
    if (isRecurring) {
      body.is_recurring = true
      body.recurrence_pattern = formData.get('recurrence_pattern')
      body.recurrence_end_date = formData.get('recurrence_end_date') || null
      // next_occurrence starts at the due_date so the cron knows when to spawn
      body.next_occurrence = dueDate || null
    }
    startTransition(async () => {
      setError(null)
      const res = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const { error } = await res.json()
        setError(error?.message ?? 'Failed to create task')
        return
      }
      setOpen(false)
      window.location.reload()
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus aria-hidden="true" className="w-4 h-4" /> New task
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-dialog-title"
      onClick={() => setOpen(false)}
    >
      <div className="card w-full max-w-md p-6 space-y-4 shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 id="task-dialog-title" className="font-semibold text-text-primary">New task</h2>
          <button onClick={() => setOpen(false)} className="btn-ghost p-1" aria-label="Close dialog">
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="task-title" className="text-sm font-medium text-text-primary">Title</label>
            <input id="task-title" name="title" required aria-required="true" placeholder="What needs to be done?" className="input" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="task-priority" className="text-sm font-medium text-text-primary">Priority</label>
              <select id="task-priority" name="priority" defaultValue="medium" className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="task-due-date" className="text-sm font-medium text-text-primary">Due date</label>
              <input
                id="task-due-date"
                name="due_date"
                type="date"
                className="input"
                value={dueDate}
                onChange={(e) => { setDueDate(e.target.value); setTimeSlots([]) }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="task-due-time" className="text-sm font-medium text-text-primary">
                Time <span className="text-text-tertiary font-normal">(optional)</span>
              </label>
              <button
                type="button"
                id="suggest-time-btn"
                onClick={() => {
                  const titleEl = document.getElementById('task-title') as HTMLInputElement | null
                  const priorityEl = document.getElementById('task-priority') as HTMLSelectElement | null
                  suggestTime(titleEl?.value ?? '', priorityEl?.value ?? 'medium')
                }}
                disabled={suggestingTime}
                className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors"
                style={{
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  color: '#A5B4FC',
                }}
              >
                {suggestingTime
                  ? <><Spinner size="sm" /> Thinking…</>
                  : <><Sparkles className="w-3 h-3" /> Suggest time</>
                }
              </button>
            </div>
            <input
              id="task-due-time"
              name="due_time"
              type="time"
              className="input"
              value={dueTime}
              onChange={(e) => { setDueTime(e.target.value); setTimeSlots([]) }}
            />
            {/* Smart schedule suggestions */}
            {timeSlots.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => { setDueTime(slot.time); setTimeSlots([]) }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors"
                    style={{
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.2)',
                    }}
                  >
                    <span className="font-semibold text-text-primary">{slot.label}</span>
                    <span className="text-text-tertiary ml-2">{slot.reason}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {goals.length > 0 && (
            <div className="space-y-1">
              <label htmlFor="task-goal" className="text-sm font-medium text-text-primary">Link to goal</label>
              <select id="task-goal" name="goal_id" className="input">
                <option value="">No goal</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Recurring toggle */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 rounded-full bg-surface-tertiary peer-checked:bg-primary transition-colors relative">
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
              </div>
              <Repeat aria-hidden="true" className="w-4 h-4 text-text-secondary" />
              <span className="text-sm font-medium text-text-primary">Repeat</span>
            </label>

            {isRecurring && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="task-recurrence-freq" className="text-sm font-medium text-text-primary">Frequency</label>
                  <select id="task-recurrence-freq" name="recurrence_pattern" defaultValue="weekly" className="input">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="task-recurrence-end" className="text-sm font-medium text-text-primary">End date</label>
                  <input id="task-recurrence-end" name="recurrence_end_date" type="date" className="input" placeholder="Optional" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? <Spinner size="sm" /> : <Plus aria-hidden="true" className="w-4 h-4" />}
              {isPending ? 'Creating...' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
