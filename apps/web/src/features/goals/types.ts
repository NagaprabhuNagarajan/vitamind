export type { Goal } from '@/lib/types'

export interface CreateGoalInput {
  title: string
  description?: string
  target_date?: string
  progress?: number
}

export interface UpdateGoalInput {
  title?: string
  description?: string
  target_date?: string | null
  progress?: number
  is_completed?: boolean
}
