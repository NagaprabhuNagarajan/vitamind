import type { UUID } from '@/lib/types'

export interface ReviewData {
  tasks_completed: number
  tasks_created: number
  completion_rate: number
  habits_completion_rate: number
  best_streak: { habit: string; days: number }
  goals_progress: { title: string; start: number; end: number }[]
  avg_momentum: number
  burnout_events: number
  patterns_discovered: number
}

export interface LifeReview {
  id: UUID
  user_id: UUID
  month: string    // YYYY-MM
  report: string
  data: ReviewData
  created_at: string
}
