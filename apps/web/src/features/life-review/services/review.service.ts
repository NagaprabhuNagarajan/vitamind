import { createClient } from '@/lib/supabase/server'
import { complete } from '@/features/ai/services/ai-provider'
import type { LifeReview, ReviewData } from '../types'

export class LifeReviewService {
  /** Get a specific month's review or generate it */
  static async getReview(userId: string, month: string): Promise<LifeReview | null> {
    const supabase = await createClient()

    // Check for existing review
    const { data: existing } = await supabase
      .from('life_reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .single()

    if (existing) return existing as LifeReview

    // Generate if the month is complete (not current month)
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    if (month >= currentMonth) return null // Can't review current/future months

    return this.generateReview(userId, month)
  }

  /** Get all reviews for a user */
  static async getAllReviews(userId: string): Promise<LifeReview[]> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('life_reviews')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: false })

    return (data ?? []) as LifeReview[]
  }

  /** Generate a monthly life review */
  static async generateReview(userId: string, month: string): Promise<LifeReview> {
    const supabase = await createClient()

    const [year, m] = month.split('-').map(Number)
    const startDate = new Date(year, m - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, m, 0).toISOString().split('T')[0] // last day of month

    // Gather monthly data
    const [
      { count: tasksCompleted },
      { count: tasksCreated },
      { data: habitLogs },
      { data: habits },
      { data: goals },
      { data: momentum },
      { count: burnoutCount },
    ] = await Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed').gte('completed_at', startDate).lte('completed_at', `${endDate}T23:59:59`),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startDate).lte('created_at', `${endDate}T23:59:59`),
      supabase.from('habit_logs').select('habit_id, status').eq('user_id', userId).gte('date', startDate).lte('date', endDate),
      supabase.from('habits').select('id, title').eq('user_id', userId).eq('is_active', true),
      supabase.from('goals').select('id, title, progress').eq('user_id', userId),
      supabase.from('momentum_snapshots').select('score').eq('user_id', userId).gte('date', startDate).lte('date', endDate),
      supabase.from('burnout_alerts').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('date', startDate).lte('date', endDate).gte('risk_level', 70),
    ])

    const completedLogs = (habitLogs ?? []).filter((l) => l.status === 'completed').length
    const totalPossibleLogs = (habits?.length ?? 1) * 30 // approx
    const habitsCompletionRate = totalPossibleLogs > 0 ? Math.round((completedLogs / totalPossibleLogs) * 100) : 0

    // Best streak (approximate from logs)
    const habitLogCounts = new Map<string, number>()
    for (const log of habitLogs ?? []) {
      if (log.status === 'completed') {
        habitLogCounts.set(log.habit_id, (habitLogCounts.get(log.habit_id) ?? 0) + 1)
      }
    }
    let bestStreak = { habit: 'None', days: 0 }
    for (const [habitId, count] of habitLogCounts) {
      if (count > bestStreak.days) {
        bestStreak = { habit: habits?.find((h) => h.id === habitId)?.title ?? 'Unknown', days: count }
      }
    }

    const avgMomentum = (momentum ?? []).length > 0
      ? Math.round((momentum ?? []).reduce((s, m) => s + m.score, 0) / (momentum ?? []).length)
      : 0

    const completionRate = (tasksCreated ?? 1) > 0
      ? Math.round(((tasksCompleted ?? 0) / (tasksCreated ?? 1)) * 100)
      : 0

    const reviewData: ReviewData = {
      tasks_completed: tasksCompleted ?? 0,
      tasks_created: tasksCreated ?? 0,
      completion_rate: completionRate,
      habits_completion_rate: habitsCompletionRate,
      best_streak: bestStreak,
      goals_progress: (goals ?? []).map((g) => ({ title: g.title, start: 0, end: g.progress ?? 0 })),
      avg_momentum: avgMomentum,
      burnout_events: burnoutCount ?? 0,
      patterns_discovered: 0,
    }

    // Generate AI report
    const monthName = new Date(year, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const prompt = `You are VitaMind. Generate a monthly "State of Your Life" review for ${monthName}.

DATA:
- Tasks: ${reviewData.tasks_completed}/${reviewData.tasks_created} completed (${reviewData.completion_rate}%)
- Habit consistency: ${reviewData.habits_completion_rate}%
- Best habit streak: "${reviewData.best_streak.habit}" at ${reviewData.best_streak.days} days
- Average momentum score: ${reviewData.avg_momentum}/100
- Burnout alerts: ${reviewData.burnout_events}
- Goals: ${reviewData.goals_progress.map((g) => `${g.title} (${g.end}%)`).join(', ') || 'none'}

Write a structured monthly review with these sections:
## Highlights
[2-3 achievements worth celebrating]

## Areas for Growth
[2-3 areas that need attention, with specific suggestions]

## Goal Check-in
[Brief status on each goal, on-track or needs adjustment]

## Next Month Focus
[2-3 priorities for the coming month]

Keep it warm, honest, and actionable. Under 400 words.`

    let report: string
    try {
      report = await complete({ prompt, maxTokens: 600 })
    } catch {
      report = `## ${monthName} Review\n\nCompleted ${reviewData.tasks_completed} tasks with ${reviewData.completion_rate}% completion rate. Habit consistency was ${reviewData.habits_completion_rate}%. Average momentum: ${reviewData.avg_momentum}/100.\n\nKeep building on your progress next month.`
    }

    // Store the review
    const { data: review, error } = await supabase
      .from('life_reviews')
      .upsert({
        user_id: userId,
        month,
        report,
        data: reviewData,
      }, { onConflict: 'user_id,month' })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return review as LifeReview
  }
}
