export type { Habit, HabitLog, HabitFrequency, HabitLogStatus } from '@/lib/types'

export interface CreateHabitInput {
  title: string
  description?: string
  frequency: import('@/lib/types').HabitFrequency
  target_days?: number[]
  reminder_time?: string
}

export interface UpdateHabitInput {
  title?: string
  description?: string
  frequency?: import('@/lib/types').HabitFrequency
  target_days?: number[] | null
  reminder_time?: string | null
  is_active?: boolean
}

export interface HabitWithStreak {
  habit: import('@/lib/types').Habit
  streak: number
  todayLog: import('@/lib/types').HabitLog | null
}
