/**
 * Supabase Edge Function: compute-time-fingerprint
 *
 * Analyses task completion and habit check-in timestamps to build a
 * per-user productivity profile. Scheduled weekly via pg_cron (Sundays).
 *
 * Deploy: supabase functions deploy compute-time-fingerprint
 * Schedule (in Supabase dashboard SQL editor):
 *   select cron.schedule('compute-time-fingerprint', '0 3 * * 0',
 *     $$select net.http_post(url := 'https://<project>.supabase.co/functions/v1/compute-time-fingerprint',
 *       headers := '{"Authorization":"Bearer <service_role_key>"}',
 *       body := '{}')$$);
 *
 * Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProductivityProfile {
  peak_hours: number[]
  low_hours: number[]
  best_day: string
  worst_day: string
  habit_morning_rate: number
  habit_evening_rate: number
  avg_tasks_per_day: number
  most_productive_window: string
  computed_at: string
}

interface HourCount {
  [hour: number]: number
}

interface DayCount {
  [day: string]: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Minimum completed tasks needed to produce a meaningful profile
const MIN_COMPLETIONS = 5

// ─── Analysis helpers ───────────────────────────────────────────────────────

function getTopN(counts: HourCount, n: number): number[] {
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([hour]) => Number(hour))
}

function getBottomN(counts: HourCount, n: number): number[] {
  // Only include hours that have at least some activity — truly empty hours
  // are not informative (the user may simply be asleep)
  const withActivity = Object.entries(counts).filter(([, v]) => v > 0)
  return withActivity
    .sort(([, a], [, b]) => a - b)
    .slice(0, n)
    .map(([hour]) => Number(hour))
}

function getBestDay(counts: DayCount): string {
  const entries = Object.entries(counts)
  if (entries.length === 0) return DAY_NAMES[1] // default Monday
  entries.sort(([, a], [, b]) => b - a)
  return entries[0][0]
}

function getWorstDay(counts: DayCount): string {
  const entries = Object.entries(counts).filter(([, v]) => v > 0)
  if (entries.length === 0) return DAY_NAMES[0] // default Sunday
  entries.sort(([, a], [, b]) => a - b)
  return entries[0][0]
}

/** Find the best consecutive 2-hour block */
function findBestWindow(hourCounts: HourCount): string {
  let bestStart = 9
  let bestSum = 0

  for (let h = 0; h < 23; h++) {
    const sum = (hourCounts[h] ?? 0) + (hourCounts[h + 1] ?? 0)
    if (sum > bestSum) {
      bestSum = sum
      bestStart = h
    }
  }

  const format = (h: number) => {
    if (h === 0) return '12am'
    if (h < 12) return `${h}am`
    if (h === 12) return '12pm'
    return `${h - 12}pm`
  }

  return `${format(bestStart)}-${format(bestStart + 2)}`
}

// ─── Profile computation ────────────────────────────────────────────────────

async function computeProfileForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<ProductivityProfile | null> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sinceDate = thirtyDaysAgo.toISOString()

  // ── Task analysis ─────────────────────────────────────────────────────
  const { data: completedTasks } = await supabase
    .from('tasks')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .gte('completed_at', sinceDate)

  const tasks = completedTasks ?? []

  if (tasks.length < MIN_COMPLETIONS) {
    return null // not enough data for a meaningful profile
  }

  // Count completions per hour (0-23) and per day-of-week
  const hourCounts: HourCount = {}
  const dayCounts: DayCount = {}
  const dateSet = new Set<string>()

  for (const task of tasks) {
    const dt = new Date(task.completed_at)
    const hour = dt.getUTCHours()
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1

    const dayName = DAY_NAMES[dt.getUTCDay()]
    dayCounts[dayName] = (dayCounts[dayName] ?? 0) + 1

    dateSet.add(dt.toISOString().split('T')[0])
  }

  const uniqueDays = dateSet.size || 1
  const avgTasksPerDay = Math.round((tasks.length / uniqueDays) * 10) / 10

  // ── Habit analysis ────────────────────────────────────────────────────
  const { data: habitLogs } = await supabase
    .from('habit_logs')
    .select('created_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('created_at', sinceDate)

  const logs = habitLogs ?? []
  let morningCount = 0
  let eveningCount = 0

  for (const log of logs) {
    const hour = new Date(log.created_at).getUTCHours()
    if (hour >= 5 && hour < 12) morningCount++
    if (hour >= 17 && hour < 23) eveningCount++
  }

  const totalHabitCompletions = logs.length || 1
  const morningRate = Math.round((morningCount / totalHabitCompletions) * 100) / 100
  const eveningRate = Math.round((eveningCount / totalHabitCompletions) * 100) / 100

  // ── Build profile ─────────────────────────────────────────────────────
  return {
    peak_hours: getTopN(hourCounts, 3),
    low_hours: getBottomN(hourCounts, 3),
    best_day: getBestDay(dayCounts),
    worst_day: getWorstDay(dayCounts),
    habit_morning_rate: morningRate,
    habit_evening_rate: eveningRate,
    avg_tasks_per_day: avgTasksPerDay,
    most_productive_window: findBestWindow(hourCounts),
    computed_at: new Date().toISOString(),
  }
}

// ─── Main handler ───────────────────────────────────────────────────────────

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch all active users (those with at least one task or habit)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')

    if (usersError) {
      console.error('[time-fingerprint] Failed to fetch users:', usersError.message)
      return new Response(JSON.stringify({ error: usersError.message }), { status: 500 })
    }

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ computed: 0, skipped: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let computed = 0
    let skipped = 0

    for (const user of users) {
      try {
        const profile = await computeProfileForUser(supabase, user.id)

        if (!profile) {
          skipped++
          continue
        }

        const { error: updateError } = await supabase
          .from('users')
          .update({ productivity_profile: profile })
          .eq('id', user.id)

        if (updateError) {
          console.error(`[time-fingerprint] Update failed for ${user.id}:`, updateError.message)
          skipped++
        } else {
          computed++
        }
      } catch (err) {
        console.error(`[time-fingerprint] Error processing user ${user.id}:`, err)
        skipped++
      }
    }

    console.log(`[time-fingerprint] Done: computed=${computed}, skipped=${skipped}, total=${users.length}`)

    return new Response(JSON.stringify({ computed, skipped, total: users.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[time-fingerprint] Fatal error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
