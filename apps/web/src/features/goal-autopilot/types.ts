import type { UUID } from '@/lib/types'

export interface GoalPlan {
  id: UUID
  user_id: UUID
  goal_id: UUID
  week_number: number
  tasks_generated: GeneratedTask[]
  habits_suggested: SuggestedHabit[]
  status: 'active' | 'adjusted' | 'completed'
  created_at: string
}

export interface GeneratedTask {
  title: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimated_minutes: number
  due_date: string
}

export interface SuggestedHabit {
  title: string
  frequency: 'daily' | 'weekly' | 'weekdays'
  reason: string
}

export interface AutopilotStatus {
  goal_id: string
  goal_title: string
  enabled: boolean
  current_plan: GoalPlan | null
  progress: number
  weeks_remaining: number
  on_track: boolean
}
