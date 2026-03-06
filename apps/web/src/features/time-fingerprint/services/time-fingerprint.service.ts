import { createClient } from '@/lib/supabase/server'

export interface ProductivityProfile {
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export class TimeFingerprintService {
  /** Get cached profile or compute if stale (> 7 days old) */
  static async getProfile(userId: string): Promise<{ profile: ProductivityProfile | null; has_enough_data: boolean }> {
    const supabase = await createClient()

    const { data: user } = await supabase
      .from('users')
      .select('productivity_profile')
      .eq('id', userId)
      .single()

    const profile = user?.productivity_profile as ProductivityProfile | null
    const hasEnough = await this.hasEnoughData(userId)

    // Return cached if fresh
    if (profile?.computed_at) {
      const age = Date.now() - new Date(profile.computed_at).getTime()
      if (age < 7 * 24 * 60 * 60 * 1000) {
        return { profile, has_enough_data: hasEnough }
      }
    }

    // Recompute if we have enough data
    if (hasEnough) {
      const newProfile = await this.computeProfile(userId)
      return { profile: newProfile, has_enough_data: true }
    }

    return { profile, has_enough_data: false }
  }

  /** Check if user has 14+ days of task/habit data */
  static async hasEnoughData(userId: string): Promise<boolean> {
    const supabase = await createClient()
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', fourteenDaysAgo.toISOString())

    return (count ?? 0) >= 5
  }

  /** Compute the productivity profile from task + habit data */
  static async computeProfile(userId: string): Promise<ProductivityProfile | null> {
    const supabase = await createClient()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Fetch completed tasks with timestamps
    const { data: tasks } = await supabase
      .from('tasks')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .gte('completed_at', thirtyDaysAgo.toISOString())

    // Fetch habit logs with timestamps
    const { data: habitLogs } = await supabase
      .from('habit_logs')
      .select('created_at, status')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (!tasks?.length && !habitLogs?.length) return null

    // ── Hour analysis ─────────────────────────────────────────────────
    const hourCounts = new Array(24).fill(0)
    const dayCounts = new Array(7).fill(0)
    const dayTasks = new Array(7).fill(0)
    const uniqueDays = new Set<string>()

    for (const t of tasks ?? []) {
      const d = new Date(t.completed_at)
      hourCounts[d.getHours()]++
      dayCounts[d.getDay()]++
      dayTasks[d.getDay()]++
      uniqueDays.add(d.toISOString().split('T')[0])
    }

    // Find top 3 peak hours and bottom 3
    const hourEntries = hourCounts.map((count, hour) => ({ hour, count }))
    hourEntries.sort((a, b) => b.count - a.count)
    const peak_hours = hourEntries.filter((h) => h.count > 0).slice(0, 3).map((h) => h.hour)
    const low_hours = hourEntries.filter((h) => h.count >= 0).slice(-3).map((h) => h.hour)

    // ── Day analysis ──────────────────────────────────────────────────
    const dayEntries = dayCounts.map((count, day) => ({ day, count }))
    dayEntries.sort((a, b) => b.count - a.count)
    const best_day = DAY_NAMES[dayEntries[0]?.day ?? 1]
    const worst_day = DAY_NAMES[dayEntries[dayEntries.length - 1]?.day ?? 0]

    // ── Habit morning vs evening ──────────────────────────────────────
    let morningCount = 0
    let eveningCount = 0
    for (const log of habitLogs ?? []) {
      const hour = new Date(log.created_at).getHours()
      if (hour >= 5 && hour < 12) morningCount++
      else if (hour >= 17 && hour < 23) eveningCount++
    }
    const totalHabitTime = morningCount + eveningCount || 1
    const habit_morning_rate = Math.round((morningCount / totalHabitTime) * 100) / 100
    const habit_evening_rate = Math.round((eveningCount / totalHabitTime) * 100) / 100

    // ── Average tasks per day ─────────────────────────────────────────
    const totalDays = Math.max(uniqueDays.size, 1)
    const avg_tasks_per_day = Math.round(((tasks?.length ?? 0) / totalDays) * 10) / 10

    // ── Most productive window (best consecutive 2 hours) ─────────────
    let bestWindow = 0
    let bestWindowStart = 9
    for (let i = 0; i < 23; i++) {
      const windowTotal = hourCounts[i] + hourCounts[i + 1]
      if (windowTotal > bestWindow) {
        bestWindow = windowTotal
        bestWindowStart = i
      }
    }
    const formatHour = (h: number) => h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
    const most_productive_window = `${formatHour(bestWindowStart)}-${formatHour(bestWindowStart + 2)}`

    const profile: ProductivityProfile = {
      peak_hours,
      low_hours,
      best_day,
      worst_day,
      habit_morning_rate,
      habit_evening_rate,
      avg_tasks_per_day,
      most_productive_window,
      computed_at: new Date().toISOString(),
    }

    // Store in users table
    await supabase
      .from('users')
      .update({ productivity_profile: profile })
      .eq('id', userId)

    return profile
  }
}
