import { createClient } from '@/lib/supabase/server'

export interface HealthEntry {
  id: string
  user_id: string
  date: string
  sleep_hours: number | null
  steps: number | null
  water_ml: number | null
  weight_kg: number | null
  exercise_minutes: number | null
  mood: number | null   // 1–5
  notes: string | null
  created_at: string
}

export interface HealthInsights {
  avg_sleep: number | null
  avg_steps: number | null
  avg_mood: number | null
  avg_exercise: number | null
  sleep_trend: 'improving' | 'declining' | 'stable'
  mood_trend: 'improving' | 'declining' | 'stable'
  streak_days: number   // consecutive days with any entry
}

function trend(values: number[]): 'improving' | 'declining' | 'stable' {
  if (values.length < 4) return 'stable'
  const half = Math.floor(values.length / 2)
  const firstHalf = values.slice(0, half).reduce((s, v) => s + v, 0) / half
  const secondHalf = values.slice(half).reduce((s, v) => s + v, 0) / (values.length - half)
  const delta = secondHalf - firstHalf
  if (delta > 0.3) return 'improving'
  if (delta < -0.3) return 'declining'
  return 'stable'
}

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  if (!valid.length) return null
  return Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * 10) / 10
}

export class HealthService {
  static async getEntries(
    userId: string,
    options: { days?: number; limit?: number } = {},
  ): Promise<HealthEntry[]> {
    const supabase = await createClient()
    let query = supabase
      .from('health_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (options.days) {
      const since = new Date()
      since.setDate(since.getDate() - options.days)
      query = query.gte('date', since.toISOString().split('T')[0])
    }
    if (options.limit) query = query.limit(options.limit)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as HealthEntry[]
  }

  static async upsertEntry(
    userId: string,
    entry: {
      date?: string
      sleep_hours?: number
      steps?: number
      water_ml?: number
      weight_kg?: number
      exercise_minutes?: number
      mood?: number
      notes?: string
    },
  ): Promise<HealthEntry> {
    const supabase = await createClient()
    const date = entry.date ?? new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('health_entries')
      .upsert(
        { user_id: userId, date, ...entry },
        { onConflict: 'user_id,date' },
      )
      .select()
      .single()
    if (error) throw error
    return data as HealthEntry
  }

  static async getInsights(userId: string, days = 30): Promise<HealthInsights> {
    const entries = await this.getEntries(userId, { days })

    // sort ascending for trend analysis
    const asc = [...entries].sort((a, b) => a.date.localeCompare(b.date))

    const sleepTrend = trend(asc.filter((e) => e.sleep_hours !== null).map((e) => e.sleep_hours!))
    const moodTrend = trend(asc.filter((e) => e.mood !== null).map((e) => e.mood!))

    // consecutive days streak (today backwards)
    let streak = 0
    const today = new Date()
    const entryDates = new Set(entries.map((e) => e.date))
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      if (entryDates.has(d.toISOString().split('T')[0])) {
        streak++
      } else {
        break
      }
    }

    return {
      avg_sleep: avg(entries.map((e) => e.sleep_hours)),
      avg_steps: avg(entries.map((e) => e.steps)),
      avg_mood: avg(entries.map((e) => e.mood)),
      avg_exercise: avg(entries.map((e) => e.exercise_minutes)),
      sleep_trend: sleepTrend,
      mood_trend: moodTrend,
      streak_days: streak,
    }
  }
}
