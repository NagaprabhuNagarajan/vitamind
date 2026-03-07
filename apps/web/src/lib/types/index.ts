// ─── Shared Domain Types ──────────────────────────────────────────────────────

export type UUID = string

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled'

export type HabitFrequency = 'daily' | 'weekly' | 'weekdays' | 'weekends'

export type HabitLogStatus = 'completed' | 'skipped' | 'missed'

export type InsightType = 'daily_plan' | 'productivity' | 'life_optimization'

// ─── Database Models (matches Supabase schema) ────────────────────────────────

export interface User {
  id: UUID
  email: string
  name: string
  avatar_url: string | null
  timezone: string
  created_at: string
  updated_at: string
}

export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly'

export interface Task {
  id: UUID
  user_id: UUID
  goal_id: UUID | null
  title: string
  description: string | null
  priority: Priority
  status: TaskStatus
  due_date: string | null
  due_time: string | null  // HH:MM (24-hour)
  completed_at: string | null
  is_recurring?: boolean
  recurrence_pattern?: RecurrencePattern
  recurrence_end_date?: string | null
  parent_task_id?: string | null
  next_occurrence?: string | null
  estimated_minutes?: number | null
  is_subtask?: boolean
  created_at: string
  updated_at: string
}

export type LifeDomain = 'health' | 'career' | 'relationships' | 'finance' | 'learning' | 'personal'

export interface Goal {
  id: UUID
  user_id: UUID
  title: string
  description: string | null
  target_date: string | null
  progress: number // 0–100
  is_completed: boolean
  domain: LifeDomain
  created_at: string
  updated_at: string
}

export interface Habit {
  id: UUID
  user_id: UUID
  title: string
  description: string | null
  frequency: HabitFrequency
  target_days: number[] | null // 0=Sun, 1=Mon, ... (for weekly)
  reminder_time: string | null // HH:MM
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface HabitLog {
  id: UUID
  habit_id: UUID
  user_id: UUID
  date: string // YYYY-MM-DD
  status: HabitLogStatus
  created_at: string
}

export interface AIInsight {
  id: UUID
  user_id: UUID
  type: InsightType
  content: string
  metadata: Record<string, unknown> | null
  created_at: string
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number  // 1-based
  limit: number // max 100
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiPaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
  error: null
}

export interface ApiError {
  data: null
  error: {
    message: string
    code?: string
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError

// ─── Dashboard Aggregate ──────────────────────────────────────────────────────

export interface DashboardData {
  tasks_today: Task[]
  tasks_overdue: Task[]
  goals: Goal[]
  habits_today: Array<Habit & { log: HabitLog | null; streak: number }>
  latest_insight: AIInsight | null
}
