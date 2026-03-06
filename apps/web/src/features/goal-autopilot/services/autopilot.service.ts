import { createClient } from '@/lib/supabase/server'
import { complete } from '@/features/ai/services/ai-provider'
import type { GoalPlan, GeneratedTask, SuggestedHabit, AutopilotStatus } from '../types'
import type { Goal } from '@/lib/types'

export class AutopilotService {
  /** Get autopilot status for all goals */
  static async getStatus(userId: string): Promise<AutopilotStatus[]> {
    const supabase = await createClient()

    const { data: goals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)

    if (!goals?.length) return []

    const results: AutopilotStatus[] = []
    for (const goal of goals) {
      const { data: plan } = await supabase
        .from('goal_plans')
        .select('*')
        .eq('goal_id', goal.id)
        .eq('status', 'active')
        .order('week_number', { ascending: false })
        .limit(1)
        .single()

      const now = new Date()
      const targetDate = goal.target_date ? new Date(goal.target_date) : null
      const weeksRemaining = targetDate
        ? Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / (7 * 86400000)))
        : 0
      const remaining = 100 - (goal.progress ?? 0)
      const weeklyNeeded = weeksRemaining > 0 ? remaining / weeksRemaining : remaining
      const onTrack = weeklyNeeded <= 10 // less than 10% per week needed

      results.push({
        goal_id: goal.id,
        goal_title: goal.title,
        enabled: goal.autopilot_enabled ?? false,
        current_plan: plan as GoalPlan | null,
        progress: goal.progress ?? 0,
        weeks_remaining: weeksRemaining,
        on_track: onTrack,
      })
    }

    return results
  }

  /** Enable autopilot for a goal and generate first week's plan */
  static async enableAutopilot(userId: string, goalId: string): Promise<GoalPlan> {
    const supabase = await createClient()

    // Enable flag
    await supabase.from('goals').update({ autopilot_enabled: true }).eq('id', goalId).eq('user_id', userId)

    // Get goal details
    const { data: goal } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single()

    if (!goal) throw new Error('Goal not found')

    return this.generateWeeklyPlan(userId, goal as Goal, 1)
  }

  /** Disable autopilot */
  static async disableAutopilot(userId: string, goalId: string): Promise<void> {
    const supabase = await createClient()
    await supabase.from('goals').update({ autopilot_enabled: false }).eq('id', goalId).eq('user_id', userId)
  }

  /** Generate a weekly task plan for a goal */
  static async generateWeeklyPlan(userId: string, goal: Goal, weekNumber: number): Promise<GoalPlan> {
    const supabase = await createClient()
    const now = new Date()
    const targetDate = goal.target_date ? new Date(goal.target_date) : null
    const weeksLeft = targetDate
      ? Math.max(1, Math.ceil((targetDate.getTime() - now.getTime()) / (7 * 86400000)))
      : 8

    // Get existing completed tasks for this goal
    const { count: completedCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('goal_id', goal.id)
      .eq('user_id', userId)
      .eq('status', 'completed')

    const prompt = `You are VitaMind. Generate this week's tasks for a goal.

GOAL: "${goal.title}"${goal.description ? `\nDESCRIPTION: ${goal.description}` : ''}
PROGRESS: ${goal.progress ?? 0}%
${targetDate ? `DEADLINE: ${goal.target_date} (${weeksLeft} weeks left)` : 'No deadline set'}
WEEK: ${weekNumber}
TASKS ALREADY COMPLETED: ${completedCount ?? 0}

Generate 3-5 specific, actionable tasks for this week that advance the goal.
Also suggest 0-2 supporting habits if relevant.

Each task needs: title (verb-first), priority (low/medium/high/urgent), estimated_minutes (15-120), due_date (YYYY-MM-DD, spread across this week starting from ${now.toISOString().split('T')[0]}).

Each habit needs: title, frequency (daily/weekly/weekdays), reason (1 sentence).

JSON format:
{"tasks":[{"title":"...","priority":"medium","estimated_minutes":30,"due_date":"YYYY-MM-DD"}],"habits":[{"title":"...","frequency":"daily","reason":"..."}]}`

    let tasks: GeneratedTask[] = []
    let habits: SuggestedHabit[] = []

    try {
      const response = await complete({ prompt, maxTokens: 500 })
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
      tasks = parsed.tasks ?? []
      habits = parsed.habits ?? []
    } catch {
      // Fallback tasks
      const weekStart = new Date(now)
      tasks = [
        { title: `Research next steps for "${goal.title}"`, priority: 'high', estimated_minutes: 30, due_date: weekStart.toISOString().split('T')[0] },
        { title: `Work on "${goal.title}" - main action`, priority: 'high', estimated_minutes: 60, due_date: new Date(weekStart.getTime() + 2 * 86400000).toISOString().split('T')[0] },
        { title: `Review progress on "${goal.title}"`, priority: 'medium', estimated_minutes: 15, due_date: new Date(weekStart.getTime() + 5 * 86400000).toISOString().split('T')[0] },
      ]
    }

    // Store the plan
    const { data: plan, error } = await supabase
      .from('goal_plans')
      .upsert({
        user_id: userId,
        goal_id: goal.id,
        week_number: weekNumber,
        tasks_generated: tasks,
        habits_suggested: habits,
        status: 'active',
      }, { onConflict: 'goal_id,week_number' })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // Create actual tasks in the tasks table
    const taskRows = tasks.map((t) => ({
      user_id: userId,
      title: t.title,
      priority: t.priority,
      estimated_minutes: t.estimated_minutes,
      due_date: t.due_date,
      goal_id: goal.id,
      status: 'todo' as const,
    }))

    await supabase.from('tasks').insert(taskRows)

    return plan as GoalPlan
  }

  /** Adjust plan based on current progress (called weekly) */
  static async adjustPlan(userId: string, goalId: string): Promise<GoalPlan | null> {
    const supabase = await createClient()

    const { data: goal } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single()

    if (!goal || !goal.autopilot_enabled) return null

    // Find current week number
    const { data: latestPlan } = await supabase
      .from('goal_plans')
      .select('week_number')
      .eq('goal_id', goalId)
      .order('week_number', { ascending: false })
      .limit(1)
      .single()

    const nextWeek = (latestPlan?.week_number ?? 0) + 1

    // Mark previous plan as adjusted
    if (latestPlan) {
      await supabase
        .from('goal_plans')
        .update({ status: 'adjusted' })
        .eq('goal_id', goalId)
        .eq('week_number', latestPlan.week_number)
    }

    return this.generateWeeklyPlan(userId, goal as Goal, nextWeek)
  }
}
