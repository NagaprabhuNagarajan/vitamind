import type { UUID } from '@/lib/types'

export interface HabitStack {
  id: UUID
  user_id: UUID
  name: string
  habit_ids: UUID[]
  suggested_time: string | null  // HH:MM
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StackWithHabits extends HabitStack {
  habits: { id: string; title: string; completed_today: boolean }[]
  completion_rate: number  // 0-100, how often the full stack is completed
}

export interface StackSuggestion {
  habit_titles: string[]
  habit_ids: string[]
  suggested_name: string
  suggested_time: string
  reason: string
}
