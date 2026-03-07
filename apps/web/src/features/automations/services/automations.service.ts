import { createClient } from '@/lib/supabase/server'

export type TriggerType =
  | 'habit_streak_broken'
  | 'task_overdue'
  | 'goal_deadline_approaching'
  | 'momentum_low'
  | 'burnout_high'

export type ActionType = 'create_task' | 'send_notification' | 'webhook'

export interface AutomationRule {
  id: string
  user_id: string
  name: string
  trigger_type: TriggerType
  trigger_config: Record<string, unknown>
  action_type: ActionType
  action_config: Record<string, unknown>
  is_active: boolean
  last_triggered_at: string | null
  created_at: string
}

// Human-readable descriptions for UI
export const TRIGGER_LABELS: Record<TriggerType, string> = {
  habit_streak_broken: 'Habit streak breaks',
  task_overdue: 'Task becomes overdue',
  goal_deadline_approaching: 'Goal deadline is approaching',
  momentum_low: 'Momentum score drops below threshold',
  burnout_high: 'Burnout risk exceeds threshold',
}

export const ACTION_LABELS: Record<ActionType, string> = {
  create_task: 'Create a recovery task',
  send_notification: 'Send a push notification',
  webhook: 'Call a webhook URL',
}

export class AutomationsService {
  static async getRules(userId: string): Promise<AutomationRule[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as AutomationRule[]
  }

  static async createRule(
    userId: string,
    rule: {
      name: string
      trigger_type: TriggerType
      trigger_config?: Record<string, unknown>
      action_type: ActionType
      action_config?: Record<string, unknown>
    },
  ): Promise<AutomationRule> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('automation_rules')
      .insert({
        user_id: userId,
        name: rule.name,
        trigger_type: rule.trigger_type,
        trigger_config: rule.trigger_config ?? {},
        action_type: rule.action_type,
        action_config: rule.action_config ?? {},
      })
      .select()
      .single()
    if (error) throw error
    return data as AutomationRule
  }

  static async updateRule(
    userId: string,
    ruleId: string,
    updates: Partial<Pick<AutomationRule, 'name' | 'is_active' | 'trigger_config' | 'action_config'>>,
  ): Promise<AutomationRule> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('automation_rules')
      .update(updates)
      .eq('id', ruleId)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data as AutomationRule
  }

  static async deleteRule(userId: string, ruleId: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('automation_rules')
      .delete()
      .eq('id', ruleId)
      .eq('user_id', userId)
    if (error) throw error
  }

  /**
   * Evaluate all active automation rules for a user and fire triggered actions.
   * Called by the daily cron job (POST /api/v1/cron/automations).
   */
  static async evaluateRules(userId: string): Promise<{ fired: number }> {
    const supabase = await createClient()
    const rules = await this.getRules(userId)
    const activeRules = rules.filter((r) => r.is_active)
    if (!activeRules.length) return { fired: 0 }

    // Fetch current state for evaluation
    const today = new Date().toISOString().split('T')[0]
    const [
      { data: overdueTasks },
      { data: momentumSnap },
      { data: habitLogs },
    ] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, due_date')
        .eq('user_id', userId)
        .eq('status', 'todo')
        .lt('due_date', today),
      supabase
        .from('momentum_snapshots')
        .select('score, burnout_risk')
        .eq('user_id', userId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('habit_logs')
        .select('habit_id, status, date')
        .eq('user_id', userId)
        .eq('date', today),
    ])

    const momentum = momentumSnap ?? null
    let fired = 0

    for (const rule of activeRules) {
      let shouldFire = false

      switch (rule.trigger_type) {
        case 'task_overdue':
          shouldFire = (overdueTasks?.length ?? 0) > 0
          break
        case 'momentum_low': {
          const threshold = (rule.trigger_config.threshold as number) ?? 40
          shouldFire = momentum !== null && momentum.score <= threshold
          break
        }
        case 'burnout_high': {
          const threshold = (rule.trigger_config.threshold as number) ?? 70
          shouldFire = momentum !== null && momentum.burnout_risk >= threshold
          break
        }
        case 'habit_streak_broken': {
          const todayDoneIds = new Set(
            (habitLogs ?? []).filter((l) => l.status === 'completed').map((l) => l.habit_id),
          )
          const targetHabitId = rule.trigger_config.habit_id as string | undefined
          if (targetHabitId) {
            shouldFire = !todayDoneIds.has(targetHabitId)
          }
          break
        }
        case 'goal_deadline_approaching': {
          const daysAhead = (rule.trigger_config.days_ahead as number) ?? 7
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() + daysAhead)
          const { data: goals } = await supabase
            .from('goals')
            .select('id')
            .eq('user_id', userId)
            .eq('is_completed', false)
            .lte('target_date', cutoff.toISOString().split('T')[0])
          shouldFire = (goals?.length ?? 0) > 0
          break
        }
      }

      if (!shouldFire) continue

      // Execute action
      if (rule.action_type === 'create_task') {
        const taskTitle = (rule.action_config.title as string) ?? `Auto: ${rule.name}`
        await supabase.from('tasks').insert({
          user_id: userId,
          title: taskTitle,
          priority: (rule.action_config.priority as string) ?? 'medium',
          status: 'todo',
        })
      } else if (rule.action_type === 'send_notification') {
        // Notification is handled by existing FCM infrastructure via Supabase Edge Function
        // We log it here; the edge function picks up new entries
        await supabase.from('ai_insights').insert({
          user_id: userId,
          insight_type: 'automation_notification',
          content: (rule.action_config.message as string) ?? rule.name,
          metadata: { rule_id: rule.id, rule_name: rule.name },
        })
      } else if (rule.action_type === 'webhook') {
        const url = rule.action_config.url as string | undefined
        if (url) {
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rule_id: rule.id, rule_name: rule.name, user_id: userId, triggered_at: new Date().toISOString() }),
          }).catch(() => { /* webhook failures are non-fatal */ })
        }
      }

      // Mark last triggered
      await supabase
        .from('automation_rules')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', rule.id)

      fired++
    }

    return { fired }
  }
}
