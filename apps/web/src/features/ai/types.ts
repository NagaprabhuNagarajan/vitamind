export type { AIInsight, InsightType } from '@/lib/types'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface DailyPlanResponse {
  plan: string
  priorities: string[]
  generated_at: string
  cached: boolean
}

export interface AIContext {
  tasks_today: import('@/lib/types').Task[]
  goals: import('@/lib/types').Goal[]
  habits: import('@/lib/types').Habit[]
  date: string
}
