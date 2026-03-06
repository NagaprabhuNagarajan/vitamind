import { createClient } from '@/lib/supabase/server'
import { HabitService } from '@/features/habits/services/habit.service'
import { MomentumService } from '@/features/momentum/services/momentum.service'
import { TimeFingerprintService } from '@/features/time-fingerprint/services/time-fingerprint.service'
import type { Task, Goal } from '@/lib/types'
import type { MomentumSnapshot } from '@/features/momentum/types'
import type { ProductivityProfile } from '@/features/time-fingerprint/services/time-fingerprint.service'

// Assembles full user context needed by all AI prompts
export async function buildUserContext(userId: string) {
  const supabase = await createClient()

  const [
    { data: profile },
    { data: tasks },
    { data: goals },
    habitsResult,
    momentum,
    fingerprint,
  ] = await Promise.all([
    supabase.from('users').select('name').eq('id', userId).single(),
    supabase.from('tasks').select('*').eq('user_id', userId).neq('status', 'cancelled'),
    supabase.from('goals').select('*').eq('user_id', userId),
    HabitService.getAllWithStreaks(userId),
    MomentumService.getCurrentScore(userId).catch(() => null),
    TimeFingerprintService.getProfile(userId).catch(() => ({ profile: null, has_enough_data: false })),
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
    momentum: momentum as MomentumSnapshot | null,
    timeFingerprint: fingerprint.profile as ProductivityProfile | null,
  }
}
