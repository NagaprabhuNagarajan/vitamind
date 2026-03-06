import { createClient } from '@/lib/supabase/server'
import { complete } from '@/features/ai/services/ai-provider'
import type { HabitGoalLink, CascadeEvent, CascadeAnalysis, AffectedGoal, CascadeResponse } from '../types'

export class CascadeService {
  /** Get full cascade view for a user */
  static async getCascadeView(userId: string): Promise<CascadeResponse> {
    const supabase = await createClient()

    const [{ data: links }, { data: events }] = await Promise.all([
      supabase.from('habit_goal_links').select('*').eq('user_id', userId),
      supabase.from('cascade_events').select('*').eq('user_id', userId).eq('acknowledged', false).order('created_at', { ascending: false }).limit(10),
    ])

    // Detect new cascades from recently missed habits
    const suggestions = await this.detectCascades(userId)

    return {
      active_cascades: (events ?? []) as CascadeEvent[],
      links: (links ?? []) as HabitGoalLink[],
      suggestions,
    }
  }

  /** Link a habit to a goal */
  static async linkHabitToGoal(
    userId: string,
    habitId: string,
    goalId: string,
    impactWeight = 0.5,
  ): Promise<HabitGoalLink> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('habit_goal_links')
      .upsert({
        user_id: userId,
        habit_id: habitId,
        goal_id: goalId,
        impact_weight: impactWeight,
      }, { onConflict: 'habit_id,goal_id' })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as HabitGoalLink
  }

  /** Remove a habit-goal link */
  static async unlinkHabitFromGoal(userId: string, linkId: string): Promise<void> {
    const supabase = await createClient()
    await supabase.from('habit_goal_links').delete().eq('id', linkId).eq('user_id', userId)
  }

  /** Detect cascading effects from missed habits */
  static async detectCascades(userId: string): Promise<CascadeAnalysis[]> {
    const supabase = await createClient()

    // Get habits with goal links
    const { data: links } = await supabase
      .from('habit_goal_links')
      .select('habit_id, goal_id, impact_weight')
      .eq('user_id', userId)

    if (!links?.length) return []

    // Get recent habit logs (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const weekAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    const uniqueHabitIds = [...new Set(links.map((l) => l.habit_id))]

    const { data: habits } = await supabase
      .from('habits')
      .select('id, title')
      .in('id', uniqueHabitIds)

    const habitMap = new Map((habits ?? []).map((h) => [h.id, h.title]))

    const { data: goals } = await supabase
      .from('goals')
      .select('id, title')
      .eq('user_id', userId)

    const goalMap = new Map((goals ?? []).map((g) => [g.id, g.title]))

    const cascades: CascadeAnalysis[] = []

    for (const habitId of uniqueHabitIds) {
      const { data: logs } = await supabase
        .from('habit_logs')
        .select('status, date')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .gte('date', weekAgoStr)

      const missedDays = 7 - (logs ?? []).filter((l) => l.status === 'completed').length
      if (missedDays < 3) continue // Only flag if missing 3+ days

      const habitTitle = habitMap.get(habitId) ?? 'Unknown habit'
      const affectedGoalLinks = links.filter((l) => l.habit_id === habitId)

      const affected_goals: AffectedGoal[] = affectedGoalLinks.map((l) => ({
        goal_id: l.goal_id,
        goal_title: goalMap.get(l.goal_id) ?? 'Unknown goal',
        impact_weight: l.impact_weight,
        estimated_delay_days: Math.round(missedDays * l.impact_weight * 2),
      }))

      cascades.push({
        habit_title: habitTitle,
        missed_days: missedDays,
        affected_goals,
        suggestion: '', // Will be filled by AI
      })
    }

    // Generate AI suggestions for detected cascades
    if (cascades.length > 0) {
      await this.generateSuggestions(userId, cascades)
    }

    return cascades
  }

  /** AI generates re-plan suggestions for cascade effects */
  static async generateSuggestions(userId: string, cascades: CascadeAnalysis[]): Promise<void> {
    const cascadeDesc = cascades.map((c) =>
      `"${c.habit_title}" missed ${c.missed_days}/7 days, affecting: ${c.affected_goals.map((g) => `${g.goal_title} (${g.estimated_delay_days} day delay)`).join(', ')}`
    ).join('\n')

    const prompt = `You are VitaMind, an AI life assistant. The user has missed key habits that are linked to their goals:

${cascadeDesc}

For each missed habit, provide a brief re-plan suggestion (1-2 sentences). Focus on:
- Whether to catch up or adjust the goal timeline
- A minimum viable action to restart the habit today

Respond as JSON: {"suggestions":["suggestion for habit 1","suggestion for habit 2",...]}`

    try {
      const response = await complete({ prompt, maxTokens: 300 })
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] ?? '{"suggestions":[]}')
      cascades.forEach((c, i) => {
        c.suggestion = parsed.suggestions?.[i] ?? 'Try a smaller version of this habit today to rebuild momentum.'
      })

      // Store cascade events
      const supabase = await createClient()
      for (const cascade of cascades) {
        await supabase.from('cascade_events').insert({
          user_id: userId,
          habit_id: cascades.indexOf(cascade).toString(), // placeholder
          affected_goals: cascade.affected_goals,
          suggestion: cascade.suggestion,
        }).select()
      }
    } catch {
      cascades.forEach((c) => {
        c.suggestion = 'Try a smaller version of this habit today to rebuild momentum.'
      })
    }
  }

  /** Acknowledge a cascade event */
  static async acknowledge(userId: string, eventId: string): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from('cascade_events')
      .update({ acknowledged: true })
      .eq('id', eventId)
      .eq('user_id', userId)
  }

  /** Auto-suggest habit-goal links based on correlation */
  static async suggestLinks(userId: string): Promise<{ habit_id: string; goal_id: string; reason: string }[]> {
    const supabase = await createClient()

    const [{ data: habits }, { data: goals }] = await Promise.all([
      supabase.from('habits').select('id, title').eq('user_id', userId).eq('is_active', true),
      supabase.from('goals').select('id, title').eq('user_id', userId).eq('is_completed', false),
    ])

    if (!habits?.length || !goals?.length) return []

    const prompt = `Given these habits and goals, suggest which habits likely impact which goals:

Habits: ${habits.map((h) => h.title).join(', ')}
Goals: ${goals.map((g) => g.title).join(', ')}

Respond as JSON: {"links":[{"habit":"exact habit title","goal":"exact goal title","reason":"brief reason"}]}
Only suggest links where there's a clear causal relationship. Max 5 links.`

    try {
      const response = await complete({ prompt, maxTokens: 300 })
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] ?? '{"links":[]}')
      const habitTitleMap = new Map(habits.map((h) => [h.title.toLowerCase(), h.id]))
      const goalTitleMap = new Map(goals.map((g) => [g.title.toLowerCase(), g.id]))

      return (parsed.links ?? [])
        .map((l: { habit: string; goal: string; reason: string }) => ({
          habit_id: habitTitleMap.get(l.habit?.toLowerCase()),
          goal_id: goalTitleMap.get(l.goal?.toLowerCase()),
          reason: l.reason,
        }))
        .filter((l: { habit_id?: string; goal_id?: string }) => l.habit_id && l.goal_id)
    } catch {
      return []
    }
  }
}
