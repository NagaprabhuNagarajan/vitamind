import { createClient } from '@/lib/supabase/server'
import { complete } from '@/features/ai/services/ai-provider'
import type { Task } from '@/lib/types'

export interface SubtaskSuggestion {
  title: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimated_minutes: number
  due_date?: string | null
}

export interface DecompositionResult {
  parent_task: Task
  subtasks: Task[]
  reasoning: string
}

export class DecompositionService {
  /** Check if a task title looks vague/complex enough to decompose */
  static isDecomposable(title: string): boolean {
    const vaguePatterns = [
      /^(plan|prepare|organize|set up|create|build|implement|design|launch|start|finish|do|work on|handle|manage|complete|fix|improve|update|review)/i,
      /project/i,
      /\b(everything|stuff|things)\b/i,
    ]
    // Tasks with 1-3 words and matching a vague pattern are likely decomposable
    const wordCount = title.trim().split(/\s+/).length
    if (wordCount >= 2 && vaguePatterns.some((p) => p.test(title))) return true
    // Long task titles often describe complex tasks
    if (wordCount >= 5) return true
    return false
  }

  /** AI-powered task decomposition */
  static async decompose(
    userId: string,
    taskId: string,
  ): Promise<DecompositionResult> {
    const supabase = await createClient()

    // Get the parent task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single()

    if (taskError || !task) throw new Error('Task not found')

    // Get user context for better decomposition
    const [{ data: goals }, { data: habits }] = await Promise.all([
      supabase.from('goals').select('title, progress').eq('user_id', userId).eq('is_completed', false).limit(5),
      supabase.from('habits').select('title').eq('user_id', userId).eq('is_active', true).limit(5),
    ])

    const goalContext = goals?.map((g) => `${g.title} (${g.progress}%)`).join(', ') || 'none'
    const habitContext = habits?.map((h) => h.title).join(', ') || 'none'

    const prompt = `You are VitaMind, an AI life assistant. Break down this task into specific, actionable subtasks.

TASK: "${task.title}"${task.description ? `\nDESCRIPTION: ${task.description}` : ''}
PRIORITY: ${task.priority}
${task.due_date ? `DUE DATE: ${task.due_date}` : ''}

USER CONTEXT:
- Active goals: ${goalContext}
- Active habits: ${habitContext}

Generate 3-6 specific subtasks. For each, provide:
- title: clear, actionable (start with a verb)
- priority: low/medium/high/urgent (inherit from parent, adjust logically)
- estimated_minutes: realistic time estimate (5-120 min)
- due_date: if parent has due date, spread subtasks before it (YYYY-MM-DD format)

Also provide a brief reasoning (1 sentence) for the breakdown.

Respond in this exact JSON format:
{"subtasks":[{"title":"...","priority":"...","estimated_minutes":30,"due_date":"YYYY-MM-DD"}],"reasoning":"..."}`

    const response = await complete({ prompt, maxTokens: 600 })

    // Parse AI response
    let parsed: { subtasks: SubtaskSuggestion[]; reasoning: string }
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      // Fallback: create generic subtasks
      parsed = {
        subtasks: [
          { title: `Research: ${task.title}`, priority: task.priority, estimated_minutes: 30 },
          { title: `Plan: ${task.title}`, priority: task.priority, estimated_minutes: 20 },
          { title: `Execute: ${task.title}`, priority: task.priority, estimated_minutes: 60 },
          { title: `Review: ${task.title}`, priority: 'medium', estimated_minutes: 15 },
        ],
        reasoning: 'Broken down into research, planning, execution, and review phases.',
      }
    }

    // Create subtasks in database
    const subtaskRows = parsed.subtasks.map((s) => ({
      user_id: userId,
      title: s.title,
      priority: s.priority,
      estimated_minutes: s.estimated_minutes,
      due_date: s.due_date || task.due_date,
      goal_id: task.goal_id,
      parent_task_id: taskId,
      is_subtask: true,
      status: 'todo' as const,
    }))

    const { data: createdSubtasks, error: insertError } = await supabase
      .from('tasks')
      .insert(subtaskRows)
      .select()

    if (insertError) throw new Error(`Failed to create subtasks: ${insertError.message}`)

    return {
      parent_task: task as Task,
      subtasks: (createdSubtasks ?? []) as Task[],
      reasoning: parsed.reasoning,
    }
  }

  /** Get subtasks for a parent task */
  static async getSubtasks(userId: string, parentTaskId: string): Promise<Task[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('parent_task_id', parentTaskId)
      .eq('is_subtask', true)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as Task[]
  }

  /** Calculate parent task progress from subtask completions */
  static async updateParentProgress(userId: string, parentTaskId: string): Promise<number> {
    const subtasks = await this.getSubtasks(userId, parentTaskId)
    if (subtasks.length === 0) return 0

    const completed = subtasks.filter((t) => t.status === 'completed').length
    return Math.round((completed / subtasks.length) * 100)
  }
}
