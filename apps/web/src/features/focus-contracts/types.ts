import type { UUID } from '@/lib/types'

export interface FocusBlock {
  id: UUID
  user_id: UUID
  planned_tasks: UUID[]
  completed_tasks: UUID[]
  started_at: string
  ended_at: string | null
  duration_minutes: number
  focus_score: number | null
  interruptions: number
  notes: string | null
  created_at: string
}

export interface FocusSuggestion {
  task_id: UUID
  title: string
  priority: string
  estimated_minutes: number | null
  reason: string
}

export interface FocusStats {
  total_sessions: number
  avg_score: number
  total_minutes: number
  best_streak: number
}
