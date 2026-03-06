import { createClient } from '@/lib/supabase/server'
import { HabitService } from '@/features/habits/services/habit.service'
import { MomentumService } from '@/features/momentum/services/momentum.service'
import { TimeFingerprintService } from '@/features/time-fingerprint/services/time-fingerprint.service'
import {
  listCalendarEvents,
  getValidAccessToken,
  type CalendarEvent,
} from '@/features/calendar/services/google-calendar'
import type { Task, Goal } from '@/lib/types'
import type { MomentumSnapshot } from '@/features/momentum/types'
import type { ProductivityProfile } from '@/features/time-fingerprint/services/time-fingerprint.service'

// Fetch today's calendar events if the user has a connected calendar
async function fetchCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  try {
    const supabase = await createClient()
    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('access_token, refresh_token, token_expires_at, calendar_id')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .eq('sync_enabled', true)
      .single()

    if (!connection) return []

    const accessToken = await getValidAccessToken({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      token_expires_at: connection.token_expires_at,
    })

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    return await listCalendarEvents(
      accessToken,
      startOfDay,
      endOfDay,
      connection.calendar_id ?? 'primary',
    )
  } catch {
    // Calendar fetch is non-critical -- return empty if anything fails
    return []
  }
}

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
    calendarEvents,
  ] = await Promise.all([
    supabase.from('users').select('name').eq('id', userId).single(),
    supabase.from('tasks').select('*').eq('user_id', userId).neq('status', 'cancelled'),
    supabase.from('goals').select('*').eq('user_id', userId),
    HabitService.getAllWithStreaks(userId),
    MomentumService.getCurrentScore(userId).catch(() => null),
    TimeFingerprintService.getProfile(userId).catch(() => ({ profile: null, has_enough_data: false })),
    fetchCalendarEvents(userId),
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
    calendarEvents,
  }
}
