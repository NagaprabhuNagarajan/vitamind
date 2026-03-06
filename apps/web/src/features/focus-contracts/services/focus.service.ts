import { createClient } from '@/lib/supabase/server'
import { complete } from '@/features/ai/services/ai-provider'
import type { FocusBlock, FocusSuggestion, FocusStats } from '../types'

export class FocusService {
  /** Get AI-suggested tasks for a focus block */
  static async suggestTasks(userId: string, durationMinutes: number): Promise<FocusSuggestion[]> {
    const supabase = await createClient()

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, priority, estimated_minutes')
      .eq('user_id', userId)
      .in('status', ['todo', 'in_progress'])
      .order('priority', { ascending: true })
      .limit(20)

    if (!tasks?.length) return []

    // Get user's time fingerprint for optimal task selection
    const { data: profile } = await supabase
      .from('users')
      .select('productivity_profile')
      .eq('id', userId)
      .single()

    const hour = new Date().getHours()
    const fingerprint = profile?.productivity_profile

    const prompt = `You are VitaMind. Select the best tasks for a ${durationMinutes}-minute focus block right now (${hour}:00).

AVAILABLE TASKS:
${tasks.map((t) => `- "${t.title}" (priority: ${t.priority}, est: ${t.estimated_minutes ?? '?'}min)`).join('\n')}

${fingerprint ? `USER'S PEAK HOURS: ${JSON.stringify(fingerprint.peak_hours ?? [])}` : ''}

Select 2-4 tasks that fit within ${durationMinutes} minutes. Prioritize high-priority tasks and those matching the user's current productive time.

Return JSON array: [{"task_id":"...","reason":"brief reason"}]
Use exact task titles to match.`

    try {
      const response = await complete({ prompt, maxTokens: 300 })
      const parsed = JSON.parse(response.match(/\[[\s\S]*\]/)?.[0] ?? '[]')
      const taskMap = new Map(tasks.map((t) => [t.title.toLowerCase(), t]))

      return parsed
        .map((s: { task_id: string; reason: string }) => {
          const task = taskMap.get(s.task_id?.toLowerCase()) ?? tasks.find((t) => t.title.toLowerCase().includes(s.task_id?.toLowerCase()))
          if (!task) return null
          return {
            task_id: task.id,
            title: task.title,
            priority: task.priority,
            estimated_minutes: task.estimated_minutes,
            reason: s.reason,
          }
        })
        .filter(Boolean) as FocusSuggestion[]
    } catch {
      // Fallback: pick top priority tasks that fit
      return tasks.slice(0, 3).map((t) => ({
        task_id: t.id,
        title: t.title,
        priority: t.priority,
        estimated_minutes: t.estimated_minutes,
        reason: 'High priority task',
      }))
    }
  }

  /** Start a focus block */
  static async startBlock(
    userId: string,
    plannedTaskIds: string[],
    durationMinutes: number,
  ): Promise<FocusBlock> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('focus_blocks')
      .insert({
        user_id: userId,
        planned_tasks: plannedTaskIds,
        duration_minutes: durationMinutes,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as FocusBlock
  }

  /** End a focus block and compute score */
  static async endBlock(
    userId: string,
    blockId: string,
    completedTaskIds: string[],
    interruptions: number,
  ): Promise<FocusBlock> {
    const supabase = await createClient()

    // Get the block
    const { data: block } = await supabase
      .from('focus_blocks')
      .select('*')
      .eq('id', blockId)
      .eq('user_id', userId)
      .single()

    if (!block) throw new Error('Focus block not found')

    const plannedCount = (block.planned_tasks as string[]).length || 1
    const completedCount = completedTaskIds.length
    const completionRate = Math.min(completedCount / plannedCount, 1)

    // Score: 70% completion rate, 30% low interruptions
    const interruptionPenalty = Math.min(interruptions * 10, 30)
    const focusScore = Math.round(completionRate * 70 + (30 - interruptionPenalty))

    // Mark completed tasks
    if (completedTaskIds.length > 0) {
      await supabase
        .from('tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .in('id', completedTaskIds)
        .eq('user_id', userId)
    }

    const { data: updated, error } = await supabase
      .from('focus_blocks')
      .update({
        ended_at: new Date().toISOString(),
        completed_tasks: completedTaskIds,
        focus_score: focusScore,
        interruptions,
      })
      .eq('id', blockId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return updated as FocusBlock
  }

  /** Get recent focus blocks */
  static async getRecent(userId: string, limit = 10): Promise<FocusBlock[]> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('focus_blocks')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit)

    return (data ?? []) as FocusBlock[]
  }

  /** Get focus stats for the last 30 days */
  static async getStats(userId: string): Promise<FocusStats> {
    const supabase = await createClient()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

    const { data: blocks } = await supabase
      .from('focus_blocks')
      .select('focus_score, duration_minutes, started_at')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .gte('started_at', thirtyDaysAgo)
      .order('started_at', { ascending: true })

    if (!blocks?.length) {
      return { total_sessions: 0, avg_score: 0, total_minutes: 0, best_streak: 0 }
    }

    const scores = blocks.filter((b) => b.focus_score !== null).map((b) => b.focus_score as number)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const totalMinutes = blocks.reduce((s, b) => s + b.duration_minutes, 0)

    // Compute streak of consecutive days with focus blocks
    const days = new Set(blocks.map((b) => b.started_at.split('T')[0]))
    let bestStreak = 0
    let currentStreak = 0
    const sortedDays = Array.from(days).sort()
    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) {
        currentStreak = 1
      } else {
        const prev = new Date(sortedDays[i - 1])
        const curr = new Date(sortedDays[i])
        const diffDays = (curr.getTime() - prev.getTime()) / 86400000
        currentStreak = diffDays === 1 ? currentStreak + 1 : 1
      }
      bestStreak = Math.max(bestStreak, currentStreak)
    }

    return {
      total_sessions: blocks.length,
      avg_score: avgScore,
      total_minutes: totalMinutes,
      best_streak: bestStreak,
    }
  }

  /** Get the active (unfinished) focus block if any */
  static async getActive(userId: string): Promise<FocusBlock | null> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('focus_blocks')
      .select('*')
      .eq('user_id', userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    return (data as FocusBlock) ?? null
  }
}
