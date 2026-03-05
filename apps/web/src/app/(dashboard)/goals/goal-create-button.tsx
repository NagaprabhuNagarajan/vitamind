'use client'

import { useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

export function GoalCreateButton() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const body = {
      title: formData.get('title'),
      description: formData.get('description') || null,
      target_date: formData.get('target_date') || null,
    }
    startTransition(async () => {
      setError(null)
      const res = await fetch('/api/v1/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const { error } = await res.json()
        setError(error?.message ?? 'Failed to create goal')
        return
      }
      setOpen(false)
      window.location.reload()
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="w-4 h-4" /> New goal
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">New goal</h2>
          <button onClick={() => setOpen(false)} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Title</label>
            <input name="title" required placeholder="What do you want to achieve?" className="input" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Description <span className="text-text-tertiary font-normal">(optional)</span></label>
            <textarea name="description" rows={2} placeholder="Why is this goal important?" className="input resize-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Target date <span className="text-text-tertiary font-normal">(optional)</span></label>
            <input name="target_date" type="date" className="input" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? <Spinner size="sm" /> : <Plus className="w-4 h-4" />}
              {isPending ? 'Creating…' : 'Create goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
