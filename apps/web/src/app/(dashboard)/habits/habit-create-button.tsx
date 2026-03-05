'use client'

import { useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

export function HabitCreateButton() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const body = {
      title: formData.get('title'),
      frequency: formData.get('frequency'),
      reminder_time: formData.get('reminder_time') || null,
    }
    startTransition(async () => {
      setError(null)
      const res = await fetch('/api/v1/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const { error } = await res.json()
        setError(error?.message ?? 'Failed to create habit')
        return
      }
      setOpen(false)
      window.location.reload()
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="w-4 h-4" /> New habit
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">New habit</h2>
          <button onClick={() => setOpen(false)} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Habit name</label>
            <input name="title" required placeholder="e.g. Morning meditation" className="input" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-primary">Frequency</label>
              <select name="frequency" defaultValue="daily" className="input">
                <option value="daily">Every day</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekends">Weekends</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-primary">Reminder <span className="text-text-tertiary font-normal">(optional)</span></label>
              <input name="reminder_time" type="time" className="input" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? <Spinner size="sm" /> : <Plus className="w-4 h-4" />}
              {isPending ? 'Creating…' : 'Create habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
