import { createClient } from '@/lib/supabase/server'
import { HabitService } from '@/features/habits/services/habit.service'
import type { Task, Goal } from '@/lib/types'

// Assembles full user context needed by all AI prompts
export async function buildUserContext(userId: string) {
  const supabase = await createClient()

  const [
    { data: profile },
    { data: tasks },
    { data: goals },
    habitsResult,
  ] = await Promise.all([
    supabase.from('users').select('name').eq('id', userId).single(),
    supabase.from('tasks').select('*').eq('user_id', userId).neq('status', 'cancelled'),
    supabase.from('goals').select('*').eq('user_id', userId),
    HabitService.getAllWithStreaks(userId),
  ])

  return {
    name: profile?.name ?? 'there',
    date: new Date().toISOString().split('T')[0],
    tasks: (tasks ?? []) as Task[],
    goals: (goals ?? []) as Goal[],
    habits: habitsResult.data.map((h) => ({
      ...h.habit,
      streak: h.streak,
      todayLog: h.todayLog,
    })),
  }
}
