import { createClient } from '@/lib/supabase/server'
import { complete } from '@/features/ai/services/ai-provider'
import { todayISO } from '@/lib/utils'
import type { HabitStack, StackWithHabits, StackSuggestion } from '../types'

export class HabitStackingService {
  /** Get all stacks with habit details */
  static async getStacks(userId: string): Promise<StackWithHabits[]> {
    const supabase = await createClient()
    const today = todayISO()

    const { data: stacks } = await supabase
      .from('habit_stacks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (!stacks?.length) return []

    // Get all habit titles and today's logs
    const allHabitIds = [...new Set(stacks.flatMap((s) => s.habit_ids))]
    const [{ data: habits }, { data: todayLogs }] = await Promise.all([
      supabase.from('habits').select('id, title').in('id', allHabitIds),
      supabase.from('habit_logs').select('habit_id, status').eq('user_id', userId).eq('date', today).in('habit_id', allHabitIds),
    ])

    const habitMap = new Map((habits ?? []).map((h) => [h.id, h.title]))
    const logMap = new Map((todayLogs ?? []).map((l) => [l.habit_id, l.status]))

    // Get 14-day completion data for rates
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const { data: recentLogs } = await supabase
      .from('habit_logs')
      .select('habit_id, date, status')
      .eq('user_id', userId)
      .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
      .in('habit_id', allHabitIds)

    return stacks.map((stack) => {
      const stackHabits = (stack.habit_ids as string[]).map((id) => ({
        id,
        title: habitMap.get(id) ?? 'Unknown',
        completed_today: logMap.get(id) === 'completed',
      }))

      // Calculate stack completion rate (days where ALL habits in stack were completed)
      const dateMap = new Map<string, Set<string>>()
      for (const log of recentLogs ?? []) {
        if (log.status !== 'completed') continue
        if (!(stack.habit_ids as string[]).includes(log.habit_id)) continue
        if (!dateMap.has(log.date)) dateMap.set(log.date, new Set())
        dateMap.get(log.date)!.add(log.habit_id)
      }

      const stackSize = (stack.habit_ids as string[]).length
      const fullDays = [...dateMap.values()].filter((s) => s.size >= stackSize).length
      const completion_rate = Math.round((fullDays / 14) * 100)

      return {
        ...(stack as HabitStack),
        habits: stackHabits,
        completion_rate,
      }
    })
  }

  /** Create a new habit stack */
  static async createStack(
    userId: string,
    name: string,
    habitIds: string[],
    suggestedTime?: string,
  ): Promise<HabitStack> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('habit_stacks')
      .insert({
        user_id: userId,
        name,
        habit_ids: habitIds,
        suggested_time: suggestedTime || null,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as HabitStack
  }

  /** Delete a stack */
  static async deleteStack(userId: string, stackId: string): Promise<void> {
    const supabase = await createClient()
    await supabase.from('habit_stacks').delete().eq('id', stackId).eq('user_id', userId)
  }

  /** Complete all habits in a stack at once */
  static async completeStack(userId: string, stackId: string): Promise<number> {
    const supabase = await createClient()
    const today = todayISO()

    const { data: stack } = await supabase
      .from('habit_stacks')
      .select('habit_ids')
      .eq('id', stackId)
      .eq('user_id', userId)
      .single()

    if (!stack) throw new Error('Stack not found')

    let completed = 0
    for (const habitId of stack.habit_ids as string[]) {
      const { error } = await supabase
        .from('habit_logs')
        .upsert({
          habit_id: habitId,
          user_id: userId,
          date: today,
          status: 'completed',
        }, { onConflict: 'habit_id,date' })

      if (!error) completed++
    }

    return completed
  }

  /** Analyze habit completion timestamps to suggest stacks */
  static async suggestStacks(userId: string): Promise<StackSuggestion[]> {
    const supabase = await createClient()

    // Get habits with their completion timestamps
    const { data: habits } = await supabase
      .from('habits')
      .select('id, title')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (!habits || habits.length < 2) return []

    // Get recent log timestamps to find natural sequences
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const { data: logs } = await supabase
      .from('habit_logs')
      .select('habit_id, created_at, date')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
      .order('created_at', { ascending: true })

    if (!logs || logs.length < 4) return []

    // Group by date, find habits completed within 30 min of each other
    const dateGroups = new Map<string, { habit_id: string; time: Date }[]>()
    for (const log of logs) {
      if (!dateGroups.has(log.date)) dateGroups.set(log.date, [])
      dateGroups.get(log.date)!.push({ habit_id: log.habit_id, time: new Date(log.created_at) })
    }

    // Find pairs/groups that frequently appear together within 30 min
    const pairCounts = new Map<string, number>()
    for (const entries of dateGroups.values()) {
      entries.sort((a, b) => a.time.getTime() - b.time.getTime())
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const diff = entries[j].time.getTime() - entries[i].time.getTime()
          if (diff > 30 * 60 * 1000) break // more than 30 min apart
          const key = [entries[i].habit_id, entries[j].habit_id].sort().join('|')
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
        }
      }
    }

    // Filter pairs that occur 3+ times
    const frequentPairs = [...pairCounts.entries()]
      .filter(([, count]) => count >= 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)

    if (frequentPairs.length === 0) return []

    const habitMap = new Map(habits.map((h) => [h.id, h.title]))

    // Use AI to name and time the stacks
    const pairDescs = frequentPairs.map(([key]) => {
      const [id1, id2] = key.split('|')
      return `${habitMap.get(id1) ?? id1} + ${habitMap.get(id2) ?? id2}`
    }).join('; ')

    try {
      const prompt = `These habit pairs are frequently done together within 30 minutes: ${pairDescs}

For each pair, suggest:
- A short stack name (2-4 words)
- Best time to do them (HH:MM, 24hr)
- Brief reason they work well together

JSON: {"stacks":[{"name":"...","time":"HH:MM","reason":"..."}]}`

      const response = await complete({ prompt, maxTokens: 250 })
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] ?? '{"stacks":[]}')

      return frequentPairs.map(([key], i) => {
        const [id1, id2] = key.split('|')
        const aiStack = parsed.stacks?.[i] ?? {}
        return {
          habit_titles: [habitMap.get(id1) ?? '', habitMap.get(id2) ?? ''],
          habit_ids: [id1, id2],
          suggested_name: aiStack.name ?? `${habitMap.get(id1)} + ${habitMap.get(id2)}`,
          suggested_time: aiStack.time ?? '08:00',
          reason: aiStack.reason ?? 'These habits are naturally done together.',
        }
      })
    } catch {
      return frequentPairs.map(([key]) => {
        const [id1, id2] = key.split('|')
        return {
          habit_titles: [habitMap.get(id1) ?? '', habitMap.get(id2) ?? ''],
          habit_ids: [id1, id2],
          suggested_name: `${habitMap.get(id1)} + ${habitMap.get(id2)}`,
          suggested_time: '08:00',
          reason: 'These habits are naturally done together.',
        }
      })
    }
  }
}
