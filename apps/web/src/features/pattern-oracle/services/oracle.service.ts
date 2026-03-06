import { createClient } from '@/lib/supabase/server'
import { complete } from '@/features/ai/services/ai-provider'
import type { PatternInsight, PatternOracleResponse } from '../types'

export class PatternOracleService {
  /** Get all pattern insights for a user */
  static async getInsights(userId: string): Promise<PatternOracleResponse> {
    const supabase = await createClient()

    // Check if we have enough data (30+ days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: taskCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', thirtyDaysAgo.toISOString())

    if ((taskCount ?? 0) < 10) {
      return { insights: [], keystone_habit: null, has_enough_data: false }
    }

    // Get cached insights (less than 7 days old)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: cached } = await supabase
      .from('pattern_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .gte('computed_at', sevenDaysAgo.toISOString())
      .order('confidence', { ascending: false })

    if (cached && cached.length >= 3) {
      const keystone = (cached as PatternInsight[]).find((i) => i.type === 'keystone_habit')
      return {
        insights: cached as PatternInsight[],
        keystone_habit: keystone ? { title: keystone.title, impact_score: keystone.confidence } : null,
        has_enough_data: true,
      }
    }

    // Compute fresh insights
    return this.computeInsights(userId)
  }

  /** Compute pattern insights from 30 days of data */
  static async computeInsights(userId: string): Promise<PatternOracleResponse> {
    const supabase = await createClient()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sinceStr = thirtyDaysAgo.toISOString()

    // Fetch all data
    const [{ data: tasks }, { data: habitLogs }, { data: habits }] = await Promise.all([
      supabase.from('tasks').select('completed_at, status').eq('user_id', userId).gte('created_at', sinceStr),
      supabase.from('habit_logs').select('habit_id, date, status, created_at').eq('user_id', userId).gte('date', thirtyDaysAgo.toISOString().split('T')[0]),
      supabase.from('habits').select('id, title').eq('user_id', userId).eq('is_active', true),
    ])

    const habitMap = new Map((habits ?? []).map((h) => [h.id, h.title]))
    const insights: Omit<PatternInsight, 'id' | 'user_id' | 'created_at'>[] = []

    // ── Pattern 1: Habit-Task Correlation ────────────────────────────
    // On days a habit is completed, how many more tasks get done?
    const dateTaskCount = new Map<string, number>()
    for (const t of tasks ?? []) {
      if (t.status !== 'completed' || !t.completed_at) continue
      const date = new Date(t.completed_at).toISOString().split('T')[0]
      dateTaskCount.set(date, (dateTaskCount.get(date) ?? 0) + 1)
    }

    const habitDates = new Map<string, Set<string>>()
    for (const log of habitLogs ?? []) {
      if (log.status !== 'completed') continue
      if (!habitDates.has(log.habit_id)) habitDates.set(log.habit_id, new Set())
      habitDates.get(log.habit_id)!.add(log.date)
    }

    let keystoneHabit: { title: string; impact_score: number } | null = null
    let maxImpact = 0

    for (const [habitId, completedDates] of habitDates) {
      const habitTitle = habitMap.get(habitId)
      if (!habitTitle || completedDates.size < 5) continue

      const daysWithHabit = [...completedDates]
      const avgWithHabit = daysWithHabit.reduce((s, d) => s + (dateTaskCount.get(d) ?? 0), 0) / daysWithHabit.length

      const allDates = [...dateTaskCount.keys()]
      const daysWithoutHabit = allDates.filter((d) => !completedDates.has(d))
      const avgWithoutHabit = daysWithoutHabit.length > 0
        ? daysWithoutHabit.reduce((s, d) => s + (dateTaskCount.get(d) ?? 0), 0) / daysWithoutHabit.length
        : 0

      const diff = avgWithHabit - avgWithoutHabit
      if (diff > 0.5) {
        const confidence = Math.min(0.95, Math.round(diff / 5 * 100) / 100 + 0.5)
        insights.push({
          type: 'habit_task_correlation',
          title: `${habitTitle} boosts productivity`,
          description: `On days you complete "${habitTitle}", you finish ${diff.toFixed(1)} more tasks on average.`,
          data: { habit_id: habitId, avg_with: avgWithHabit, avg_without: avgWithoutHabit, diff },
          confidence,
          computed_at: new Date().toISOString(),
          is_dismissed: false,
        })

        if (diff > maxImpact) {
          maxImpact = diff
          keystoneHabit = { title: habitTitle, impact_score: confidence }
        }
      }
    }

    // ── Pattern 2: Best Day Analysis ─────────────────────────────────
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayTaskCounts = new Array(7).fill(0)
    const dayOccurrences = new Array(7).fill(0)

    for (const [date, count] of dateTaskCount) {
      const day = new Date(date).getDay()
      dayTaskCounts[day] += count
      dayOccurrences[day]++
    }

    const dayAvg = dayTaskCounts.map((total, i) => ({
      day: dayNames[i],
      avg: dayOccurrences[i] > 0 ? total / dayOccurrences[i] : 0,
    })).sort((a, b) => b.avg - a.avg)

    if (dayAvg[0].avg > 0 && dayAvg[0].avg > dayAvg[dayAvg.length - 1].avg * 1.5) {
      insights.push({
        type: 'day_pattern',
        title: `${dayAvg[0].day} is your power day`,
        description: `You average ${dayAvg[0].avg.toFixed(1)} tasks on ${dayAvg[0].day}s vs ${dayAvg[dayAvg.length - 1].avg.toFixed(1)} on ${dayAvg[dayAvg.length - 1].day}s.`,
        data: { day_averages: dayAvg },
        confidence: 0.75,
        computed_at: new Date().toISOString(),
        is_dismissed: false,
      })
    }

    // ── Pattern 3: Keystone Habit ────────────────────────────────────
    if (keystoneHabit) {
      insights.push({
        type: 'keystone_habit',
        title: `"${keystoneHabit.title}" is your keystone habit`,
        description: `This single habit has the strongest correlation with your overall productivity. Protecting it should be your top priority.`,
        data: { impact_score: keystoneHabit.impact_score },
        confidence: keystoneHabit.impact_score,
        computed_at: new Date().toISOString(),
        is_dismissed: false,
      })
    }

    // ── Pattern 4: Time Pattern ──────────────────────────────────────
    const hourCounts = new Array(24).fill(0)
    for (const t of tasks ?? []) {
      if (t.status === 'completed' && t.completed_at) {
        hourCounts[new Date(t.completed_at).getHours()]++
      }
    }
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts))
    const totalTasks = hourCounts.reduce((s, c) => s + c, 0)
    const peakPct = totalTasks > 0 ? Math.round((hourCounts[peakHour] / totalTasks) * 100) : 0

    if (peakPct > 15) {
      const formatH = (h: number) => h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
      insights.push({
        type: 'time_pattern',
        title: `${formatH(peakHour)}-${formatH(peakHour + 1)} is your peak hour`,
        description: `${peakPct}% of your completed tasks happen at this time. Schedule important work here.`,
        data: { peak_hour: peakHour, percentage: peakPct },
        confidence: Math.min(0.9, peakPct / 100 + 0.5),
        computed_at: new Date().toISOString(),
        is_dismissed: false,
      })
    }

    // Store insights
    if (insights.length > 0) {
      // Clear old insights
      await supabase
        .from('pattern_insights')
        .delete()
        .eq('user_id', userId)
        .eq('is_dismissed', false)

      await supabase
        .from('pattern_insights')
        .insert(insights.map((i) => ({ ...i, user_id: userId })))
    }

    // Fetch stored insights with IDs
    const { data: stored } = await supabase
      .from('pattern_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('confidence', { ascending: false })

    return {
      insights: (stored ?? []) as PatternInsight[],
      keystone_habit: keystoneHabit,
      has_enough_data: true,
    }
  }

  /** Dismiss an insight */
  static async dismiss(userId: string, insightId: string): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from('pattern_insights')
      .update({ is_dismissed: true })
      .eq('id', insightId)
      .eq('user_id', userId)
  }
}
