import type { UUID } from '@/lib/types'

export interface ExtractedActions {
  tasks_completed: string[]     // task titles matched and marked complete
  habits_checked: string[]      // habit titles matched and checked in
  new_tasks: { title: string; priority: 'low' | 'medium' | 'high' | 'urgent' }[]
  mood: 'great' | 'good' | 'okay' | 'stressed' | 'burned_out' | null
  notes: string | null
}

export interface VoiceLog {
  id: UUID
  user_id: UUID
  transcript: string
  actions: ExtractedActions
  duration_ms: number | null
  created_at: string
}
