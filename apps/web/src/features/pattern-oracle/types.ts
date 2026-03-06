import type { UUID } from '@/lib/types'

export type PatternType = 'habit_task_correlation' | 'habit_pair' | 'keystone_habit' | 'day_pattern' | 'time_pattern'

export interface PatternInsight {
  id: UUID
  user_id: UUID
  type: PatternType
  title: string
  description: string
  data: Record<string, unknown>
  confidence: number  // 0-1
  computed_at: string
  is_dismissed: boolean
  created_at: string
}

export interface PatternOracleResponse {
  insights: PatternInsight[]
  keystone_habit: { title: string; impact_score: number } | null
  has_enough_data: boolean
}
