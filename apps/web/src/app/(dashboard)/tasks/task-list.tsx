'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { cn, PRIORITY_COLOR, PRIORITY_LABEL, formatDate, isOverdue } from '@/lib/utils'
import {
  Circle, CheckCircle2, MoreHorizontal,
  Play, CheckCheck, RotateCcw, Trash2, Search, Repeat,
} from 'lucide-react'
import type { Task, Goal, TaskStatus, Priority } from '@/lib/types'

interface TaskListProps {
  initialTasks: Task[]
  goals: Goal[]
}

const STATUS_FILTERS: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
]

const PRIORITY_FILTERS: { value: Priority | 'all'; label: string }[] = [
  { value: 'all', label: 'All priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

type ConfirmType = 'complete' | 'revert'
type PendingAction = { task: Task; type: ConfirmType }

async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const res = await fetch(`/api/v1/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  const { data } = await res.json()
  return data as Task | null
}

// ─── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ pending, onConfirm, onCancel }: {
  pending: PendingAction
  onConfirm: () => void
  onCancel: () => void
}) {
  const isComplete = pending.type === 'complete'
  const cfg = isComplete
    ? {
        icon: <CheckCheck className="w-6 h-6 text-green-400" />,
        bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)',
        shimmer: 'rgba(34,197,94,0.5)',
        title: 'Mark as completed?',
        body: `"${pending.task.title}" will be marked as done.`,
        label: 'Complete',
        btnStyle: {
          background: 'linear-gradient(135deg,rgba(34,197,94,0.85),rgba(22,163,74,0.85))',
          border: '1px solid rgba(34,197,94,0.35)',
          boxShadow: '0 0 16px rgba(34,197,94,0.25)',
        },
      }
    : {
        icon: <RotateCcw className="w-6 h-6 text-amber-400" />,
        bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)',
        shimmer: 'rgba(245,158,11,0.5)',
        title: 'Revert task?',
        body: `"${pending.task.title}" will be moved back to To do.`,
        label: 'Revert',
        btnStyle: {
          background: 'linear-gradient(135deg,rgba(245,158,11,0.85),rgba(217,119,6,0.85))',
          border: '1px solid rgba(245,158,11,0.35)',
          boxShadow: '0 0 16px rgba(245,158,11,0.25)',
        },
      }

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
        <div className="absolute top-0 left-0 right-0 h-px" style={{
          background: `linear-gradient(90deg,transparent,${cfg.shimmer},transparent)`,
        }} />
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            {cfg.icon}
          </div>
        </div>
        <div className="text-center space-y-1.5">
          <h2 className="text-base font-semibold text-text-primary">{cfg.title}</h2>
          <p className="text-sm text-text-tertiary">{cfg.body}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button" onClick={onCancel}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >Cancel</button>
          <button
            type="button" onClick={onConfirm}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all"
            style={cfg.btnStyle}
          >{cfg.label}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Task Action Menu ──────────────────────────────────────────────────────────

function TaskMenu({ task, onAction }: {
  task: Task
  onAction: (type: 'start' | ConfirmType | 'delete') => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      const target = e.target as Node
      if (
        !btnRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  function toggle() {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    // position menu above or below depending on space
    const spaceBelow = window.innerHeight - rect.bottom
    const menuH = 160
    const top = spaceBelow > menuH ? rect.bottom + 6 : rect.top - menuH - 6
    const left = Math.min(rect.right - 180, window.innerWidth - 188)
    setPos({ top, left })
    setOpen(v => !v)
  }

  const items: { label: string; icon: React.ReactNode; action: string; color?: string }[] = []

  if (task.status === 'todo') {
    items.push({ label: 'Start task', icon: <Play className="w-4 h-4" />, action: 'start', color: '#A5B4FC' })
    items.push({ label: 'Mark complete', icon: <CheckCheck className="w-4 h-4" />, action: 'complete', color: '#4ade80' })
  }
  if (task.status === 'in_progress') {
    items.push({ label: 'Mark complete', icon: <CheckCheck className="w-4 h-4" />, action: 'complete', color: '#4ade80' })
    items.push({ label: 'Revert to To do', icon: <RotateCcw className="w-4 h-4" />, action: 'revert', color: '#fbbf24' })
  }
  if (task.status === 'completed') {
    items.push({ label: 'Revert to To do', icon: <RotateCcw className="w-4 h-4" />, action: 'revert', color: '#fbbf24' })
  }
  items.push({ label: 'Delete task', icon: <Trash2 className="w-4 h-4" />, action: 'delete', color: '#f87171' })

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary transition-all"
        style={open ? { background: 'rgba(255,255,255,0.08)', color: 'white' } : {}}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
        aria-label="Task actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[998] w-44 rounded-xl overflow-hidden py-1 animate-scale-in"
          style={{
            top: pos.top,
            left: pos.left,
            background: 'rgba(15,17,23,0.97)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setOpen(false); onAction(item.action as any) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left"
              style={{ color: item.color ?? 'rgba(255,255,255,0.6)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

// ─── Status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === 'completed') return <CheckCircle2 className="w-5 h-5 text-green-500" />
  if (status === 'in_progress') return (
    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
      style={{ borderColor: '#818CF8' }}>
      <div className="w-2 h-2 rounded-full" style={{ background: '#818CF8' }} />
    </div>
  )
  return <Circle className="w-5 h-5 text-text-tertiary" />
}

// ─── Main component ────────────────────────────────────────────────────────────

export function TaskList({ initialTasks, goals }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [acting, setActing] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)

  const router = useRouter()
  const goalMap = new Map(goals.map((g) => [g.id, g]))
  const searchLower = search.toLowerCase()
  const filtered = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    if (searchLower && !t.title.toLowerCase().includes(searchLower)
        && !(t.description?.toLowerCase().includes(searchLower))) return false
    return true
  })

  async function applyStatus(taskId: string, status: TaskStatus) {
    setActing(taskId)
    try {
      const data = await updateTaskStatus(taskId, status)
      if (data) setTasks(prev => prev.map(t => t.id === taskId ? data : t))
      router.refresh()
    } finally {
      setActing(null)
    }
  }

  async function handleDelete(taskId: string) {
    setActing(taskId)
    try {
      await fetch(`/api/v1/tasks/${taskId}`, { method: 'DELETE' })
      setTasks(prev => prev.filter(t => t.id !== taskId))
      router.refresh()
    } finally {
      setActing(null)
    }
  }

  function handleMenuAction(task: Task, action: 'start' | ConfirmType | 'delete') {
    if (action === 'start') return applyStatus(task.id, 'in_progress')
    if (action === 'delete') return handleDelete(task.id)
    setPending({ task, type: action })
  }

  function handleConfirm() {
    if (!pending) return
    const { task, type } = pending
    setPending(null)
    applyStatus(task.id, type === 'complete' ? 'completed' : 'todo')
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 py-1.5 text-xs w-full"
            />
          </div>
          <div className="flex rounded border border-border overflow-hidden">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  statusFilter === value
                    ? 'bg-primary text-white'
                    : 'bg-surface text-text-secondary hover:bg-surface-tertiary',
                )}
              >{label}</button>
            ))}
          </div>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as Priority | 'all')}
            className="input py-1.5 w-auto text-xs"
          >
            {PRIORITY_FILTERS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Task list */}
        {filtered.length === 0 ? (
          <div className="card p-12 text-center text-text-tertiary text-sm">
            No tasks match the current filters.
          </div>
        ) : (
          <div className="card divide-y divide-border">
            {filtered.map(task => {
              const done = task.status === 'completed'
              const overdue = !done && task.due_date ? isOverdue(task.due_date) : false
              const goal = task.goal_id ? goalMap.get(task.goal_id) : null
              const isActing = acting === task.id

              return (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 transition-colors',
                    isActing ? 'opacity-50' : 'hover:bg-surface-secondary',
                  )}
                >
                  <div className="flex-shrink-0">
                    <StatusIcon status={task.status} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm flex items-center gap-1.5', done ? 'line-through text-text-tertiary' : 'text-text-primary')}>
                      {task.title}
                      {task.is_recurring && (
                        <Repeat className="w-3.5 h-3.5 text-primary flex-shrink-0" aria-label="Recurring task" />
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {task.due_date && (
                        <span className={cn('text-xs', overdue ? 'text-red-500' : 'text-text-tertiary')}>
                          {overdue ? '⚠ Overdue · ' : ''}{formatDate(task.due_date)}
                        </span>
                      )}
                      {goal && <span className="text-xs text-text-tertiary">· {goal.title}</span>}
                    </div>
                  </div>

                  <span className={cn('badge', PRIORITY_COLOR[task.priority])}>
                    {PRIORITY_LABEL[task.priority]}
                  </span>

                  <TaskMenu
                    task={task}
                    onAction={action => handleMenuAction(task, action)}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {pending && (
        <ConfirmDialog
          pending={pending}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  )
}
