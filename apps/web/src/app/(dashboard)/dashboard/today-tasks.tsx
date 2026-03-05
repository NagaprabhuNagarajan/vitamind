'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn, formatDate } from '@/lib/utils'
import type { Task } from '@/lib/types'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'

interface TodayTasksProps {
  tasks: Task[]
  overdueTasks: Task[]
}

const PRIORITY_STYLES: Record<string, { dot: string; badge: string }> = {
  urgent: { dot: 'bg-red-500', badge: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  high:   { dot: 'bg-orange-500', badge: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
  medium: { dot: 'bg-secondary', badge: 'bg-secondary/10 text-purple-400 border border-secondary/20' },
  low:    { dot: 'bg-text-tertiary', badge: 'bg-white/5 text-text-tertiary border border-white/10' },
}

export function TodayTasks({ tasks, overdueTasks }: TodayTasksProps) {
  const [completing, setCompleting] = useState<string | null>(null)
  const [localTasks, setLocalTasks] = useState(tasks)

  async function handleComplete(taskId: string) {
    setCompleting(taskId)
    try {
      await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      setLocalTasks((prev) => prev.filter((t) => t.id !== taskId))
    } finally {
      setCompleting(null)
    }
  }

  const allTasks = [...overdueTasks, ...localTasks]

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 className="text-sm font-semibold text-text-primary">Today&apos;s tasks</h2>
        <Link href="/tasks" className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors font-medium">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {allTasks.length === 0 ? (
        <div className="p-10 text-center">
          <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-text-secondary">All tasks complete</p>
          <p className="text-xs text-text-tertiary mt-1">Great work today!</p>
        </div>
      ) : (
        <ul>
          {allTasks.map((task, i) => {
            const isOverdue = overdueTasks.some((t) => t.id === task.id)
            const p = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.medium
            return (
              <li
                key={task.id}
                className="flex items-center gap-3 px-5 py-3 group transition-colors duration-150 animate-fade-in"
                style={{
                  borderBottom: i < allTasks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  animationDelay: `${i * 0.04}s`,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={completing === task.id}
                  className="flex-shrink-0 transition-all duration-200"
                  aria-label={`Complete ${task.title}`}
                >
                  {completing === task.id
                    ? <CheckCircle2 className="w-4 h-4 text-primary-400" />
                    : <Circle className="w-4 h-4 text-text-muted group-hover:text-primary-400 transition-colors" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{task.title}</p>
                  {task.due_date && (
                    <p className={cn('text-xs mt-0.5', isOverdue ? 'text-red-400' : 'text-text-tertiary')}>
                      {isOverdue ? 'Overdue · ' : ''}{formatDate(task.due_date)}
                    </p>
                  )}
                </div>
                <span className={cn('badge text-xs px-2 py-0.5 rounded-full text-xs', p.badge)}>
                  {task.priority}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
