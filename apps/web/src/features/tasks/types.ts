// Task feature types — extends base types with UI-specific shapes
export type { Task, Priority, TaskStatus } from '@/lib/types'

export interface CreateTaskInput {
  title: string
  description?: string
  priority: import('@/lib/types').Priority
  due_date?: string
  due_time?: string | null  // HH:MM (24-hour)
  goal_id?: string
  is_recurring?: boolean
  recurrence_pattern?: import('@/lib/types').RecurrencePattern
  recurrence_end_date?: string | null
  next_occurrence?: string | null
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  priority?: import('@/lib/types').Priority
  status?: import('@/lib/types').TaskStatus
  due_date?: string | null
  due_time?: string | null  // HH:MM (24-hour)
  goal_id?: string | null
}

export interface TaskFilters {
  status?: import('@/lib/types').TaskStatus
  priority?: import('@/lib/types').Priority
  goal_id?: string
  date?: string // YYYY-MM-DD
  search?: string // partial title match (case-insensitive)
}
