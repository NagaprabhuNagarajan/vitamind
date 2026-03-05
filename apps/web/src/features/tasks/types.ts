// Task feature types — extends base types with UI-specific shapes
export type { Task, Priority, TaskStatus } from '@/lib/types'

export interface CreateTaskInput {
  title: string
  description?: string
  priority: import('@/lib/types').Priority
  due_date?: string
  goal_id?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  priority?: import('@/lib/types').Priority
  status?: import('@/lib/types').TaskStatus
  due_date?: string | null
  goal_id?: string | null
}

export interface TaskFilters {
  status?: import('@/lib/types').TaskStatus
  priority?: import('@/lib/types').Priority
  goal_id?: string
  date?: string // YYYY-MM-DD
}
