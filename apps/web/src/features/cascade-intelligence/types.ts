import type { UUID } from '@/lib/types'

export interface HabitGoalLink {
  id: UUID
  user_id: UUID
  habit_id: UUID
  goal_id: UUID
  impact_weight: number  // 0-1
  created_at: string
}

export interface AffectedGoal {
  goal_id: string
  goal_title: string
  impact_weight: number
  estimated_delay_days: number
}

export interface CascadeEvent {
  id: UUID
  user_id: UUID
  habit_id: UUID
  affected_goals: AffectedGoal[]
  suggestion: string | null
  acknowledged: boolean
  created_at: string
}

export interface CascadeAnalysis {
  habit_title: string
  missed_days: number
  affected_goals: AffectedGoal[]
  suggestion: string
}

export interface CascadeResponse {
  active_cascades: CascadeEvent[]
  links: HabitGoalLink[]
  suggestions: CascadeAnalysis[]
}
