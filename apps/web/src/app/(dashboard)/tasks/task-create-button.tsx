'use client'

import { useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { Goal } from '@/lib/types'

interface TaskCreateButtonProps {
  goals: Goal[]
}

export function TaskCreateButton({ goals }: TaskCreateButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const body = {
      title: formData.get('title'),
      priority: formData.get('priority'),
      due_date: formData.get('due_date') || null,
      goal_id: formData.get('goal_id') || null,
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
        <Plus className="w-4 h-4" /> New task
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">New task</h2>
          <button onClick={() => setOpen(false)} className="btn-ghost p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Title</label>
            <input name="title" required placeholder="What needs to be done?" className="input" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-primary">Priority</label>
              <select name="priority" defaultValue="medium" className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-primary">Due date</label>
              <input name="due_date" type="date" className="input" />
            </div>
          </div>

          {goals.length > 0 && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-primary">Link to goal</label>
              <select name="goal_id" className="input">
                <option value="">No goal</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? <Spinner size="sm" /> : <Plus className="w-4 h-4" />}
              {isPending ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
