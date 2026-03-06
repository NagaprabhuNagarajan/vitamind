import { createClient } from '@/lib/supabase/server'
import { complete } from '@/features/ai/services/ai-provider'
import { todayISO } from '@/lib/utils'
import type { ExtractedActions, VoiceLog } from '../types'

export class VoiceLogService {
  /** Process a voice transcript: extract actions and apply them */
  static async processTranscript(
    userId: string,
    transcript: string,
    durationMs?: number,
  ): Promise<{ log: VoiceLog; summary: string }> {
    const supabase = await createClient()

    // Get user's current tasks and habits for matching
    const [{ data: tasks }, { data: habits }] = await Promise.all([
      supabase.from('tasks').select('id, title, status').eq('user_id', userId).in('status', ['todo', 'in_progress']).limit(30),
      supabase.from('habits').select('id, title').eq('user_id', userId).eq('is_active', true),
    ])

    const taskList = (tasks ?? []).map((t) => t.title).join(', ')
    const habitList = (habits ?? []).map((h) => h.title).join(', ')

    const prompt = `You are VitaMind. Parse this voice log and extract structured actions.

TRANSCRIPT: "${transcript}"

USER'S CURRENT TASKS: ${taskList || 'none'}
USER'S ACTIVE HABITS: ${habitList || 'none'}

Extract:
1. tasks_completed: task titles from the list above that the user says they finished/completed/did
2. habits_checked: habit titles from the list above that the user says they did
3. new_tasks: any NEW tasks mentioned (not from existing list), with inferred priority
4. mood: one of "great", "good", "okay", "stressed", "burned_out" (or null if not mentioned)
5. notes: any other noteworthy information (brief, or null)

JSON format:
{"tasks_completed":["..."],"habits_checked":["..."],"new_tasks":[{"title":"...","priority":"medium"}],"mood":"good","notes":"..."}`

    let actions: ExtractedActions
    try {
      const response = await complete({ prompt, maxTokens: 400 })
      actions = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
      // Ensure all fields exist
      actions.tasks_completed = actions.tasks_completed ?? []
      actions.habits_checked = actions.habits_checked ?? []
      actions.new_tasks = actions.new_tasks ?? []
      actions.mood = actions.mood ?? null
      actions.notes = actions.notes ?? null
    } catch {
      actions = { tasks_completed: [], habits_checked: [], new_tasks: [], mood: null, notes: transcript }
    }

    // Apply actions
    const results: string[] = []

    // Complete matched tasks
    const taskMap = new Map((tasks ?? []).map((t) => [t.title.toLowerCase(), t.id]))
    for (const title of actions.tasks_completed) {
      const taskId = taskMap.get(title.toLowerCase())
      if (taskId) {
        await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId)
        results.push(`Completed task: "${title}"`)
      }
    }

    // Check in matched habits
    const today = todayISO()
    const habitMap = new Map((habits ?? []).map((h) => [h.title.toLowerCase(), h.id]))
    for (const title of actions.habits_checked) {
      const habitId = habitMap.get(title.toLowerCase())
      if (habitId) {
        await supabase.from('habit_logs').upsert({
          habit_id: habitId,
          user_id: userId,
          date: today,
          status: 'completed',
        }, { onConflict: 'habit_id,date' })
        results.push(`Checked habit: "${title}"`)
      }
    }

    // Create new tasks
    for (const newTask of actions.new_tasks) {
      await supabase.from('tasks').insert({
        user_id: userId,
        title: newTask.title,
        priority: newTask.priority ?? 'medium',
        status: 'todo',
      })
      results.push(`Created task: "${newTask.title}"`)
    }

    if (actions.mood) {
      results.push(`Mood: ${actions.mood}`)
    }

    // Store the voice log
    const { data: log } = await supabase
      .from('voice_logs')
      .insert({
        user_id: userId,
        transcript,
        actions,
        duration_ms: durationMs ?? null,
      })
      .select()
      .single()

    const summary = results.length > 0
      ? results.join('\n')
      : 'No actions extracted from this log.'

    return { log: log as VoiceLog, summary }
  }

  /** Get recent voice logs */
  static async getRecent(userId: string, limit = 10): Promise<VoiceLog[]> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('voice_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data ?? []) as VoiceLog[]
  }
}
