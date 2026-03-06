import { createClient } from '@/lib/supabase/server'
import { MomentumService } from '@/features/momentum/services/momentum.service'
import { complete } from '@/features/ai/services/ai-provider'
import type { BurnoutSignals, BurnoutAlert, BurnoutRadarResponse } from '../types'

export class BurnoutRadarService {
  /** Get the full burnout radar for a user */
  static async getRadar(userId: string): Promise<BurnoutRadarResponse> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    // Check for today's alert
    const { data: existingAlert } = await supabase
      .from('burnout_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (existingAlert) {
      const history = await this.getHistory(userId)
      return {
        current_risk: existingAlert.risk_level,
        signals: existingAlert.signals as BurnoutSignals,
        active_alert: existingAlert as BurnoutAlert,
        history,
        recovery_plan: existingAlert.recovery_plan,
      }
    }

    // Compute fresh
    return this.computeAndStore(userId)
  }

  /** Compute burnout signals from multiple data sources */
  static async detectSignals(userId: string): Promise<{ signals: BurnoutSignals; riskLevel: number }> {
    const supabase = await createClient()
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const weekAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    // Get current momentum components
    const components = await MomentumService.computeComponents(userId)

    // Get momentum history for velocity trend
    const { data: momentumHistory } = await supabase
      .from('momentum_snapshots')
      .select('score, task_velocity, date')
      .eq('user_id', userId)
      .gte('date', weekAgoStr)
      .order('date', { ascending: true })

    // Signal 1: Declining velocity (dropped >15pts in 7 days)
    let declining_velocity = false
    if (momentumHistory && momentumHistory.length >= 2) {
      const oldest = momentumHistory[0].task_velocity
      const newest = components.taskVelocity
      declining_velocity = (oldest - newest) > 15
    }

    // Signal 2: Broken habit streaks this week
    const { data: habits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)

    let broken_streaks = 0
    if (habits) {
      for (const habit of habits) {
        const { data: logs } = await supabase
          .from('habit_logs')
          .select('status')
          .eq('habit_id', habit.id)
          .eq('user_id', userId)
          .gte('date', weekAgoStr)
          .lte('date', today)
          .order('date', { ascending: false })
          .limit(3)

        const recentMisses = (logs ?? []).filter((l) => l.status === 'missed').length
        if (recentMisses >= 2) broken_streaks++
      }
    }

    // Signal 3: Growing backlog (overdue tasks grew by 3+ in 7 days)
    const { count: currentOverdue } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['todo', 'in_progress'])
      .lt('due_date', today)
      .not('due_date', 'is', null)

    const growing_backlog = (currentOverdue ?? 0) >= 5

    // Signal 4: Stalled goals (0% progress change in 14 days)
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const { data: goals } = await supabase
      .from('goals')
      .select('id, progress, updated_at')
      .eq('user_id', userId)
      .eq('is_completed', false)

    const stalled_goals = (goals ?? []).filter((g) => {
      const lastUpdate = new Date(g.updated_at)
      return lastUpdate < fourteenDaysAgo && (g.progress ?? 0) < 100
    }).length

    // Signal 5 & 6: From momentum components
    const high_overdue_pressure = components.overduePressure > 60
    const low_habit_consistency = components.habitConsistency < 30

    const signals: BurnoutSignals = {
      declining_velocity,
      broken_streaks,
      growing_backlog,
      stalled_goals,
      high_overdue_pressure,
      low_habit_consistency,
    }

    // Calculate risk level from weighted signals
    let riskLevel = components.burnoutRisk // start with base from momentum
    if (declining_velocity) riskLevel += 10
    if (broken_streaks >= 2) riskLevel += 10
    if (growing_backlog) riskLevel += 10
    if (stalled_goals >= 2) riskLevel += 5
    riskLevel = Math.min(100, Math.max(0, riskLevel))

    return { signals, riskLevel }
  }

  /** Generate AI recovery plan when risk is elevated */
  static async generateRecoveryPlan(
    userId: string,
    riskLevel: number,
    signals: BurnoutSignals,
  ): Promise<string | null> {
    if (riskLevel < 50) return null

    const supabase = await createClient()

    // Get user context for the recovery plan
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('title, due_date, priority')
      .eq('user_id', userId)
      .in('status', ['todo', 'in_progress'])
      .lt('due_date', new Date().toISOString().split('T')[0])
      .not('due_date', 'is', null)
      .order('priority', { ascending: false })
      .limit(5)

    const { data: habits } = await supabase
      .from('habits')
      .select('title')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(5)

    const signalList = []
    if (signals.declining_velocity) signalList.push('Task completion rate is dropping')
    if (signals.broken_streaks > 0) signalList.push(`${signals.broken_streaks} habit streak(s) recently broken`)
    if (signals.growing_backlog) signalList.push('Overdue tasks are growing')
    if (signals.stalled_goals > 0) signalList.push(`${signals.stalled_goals} goal(s) stalled`)
    if (signals.high_overdue_pressure) signalList.push('High overdue pressure')
    if (signals.low_habit_consistency) signalList.push('Low habit consistency')

    const prompt = `You are VitaMind, a calm AI life assistant. The user's burnout risk is ${riskLevel}/100.

Warning signals:
${signalList.map((s) => `- ${s}`).join('\n')}

Overdue tasks: ${overdueTasks?.map((t) => t.title).join(', ') || 'none'}
Active habits: ${habits?.map((h) => h.title).join(', ') || 'none'}

Generate a brief recovery plan (3-5 bullet points). Focus on:
1. Which tasks to defer or cancel to reduce pressure
2. Which 1-2 habits to protect as "non-negotiable"
3. One restorative action (rest, exercise, etc.)

Be warm, practical, and specific. Keep it under 200 words.`

    try {
      return await complete({ prompt, maxTokens: 300 })
    } catch {
      return 'Take a break today. Focus on just your top priority task and one keystone habit. Everything else can wait.'
    }
  }

  /** Compute, generate recovery plan if needed, and store */
  static async computeAndStore(userId: string): Promise<BurnoutRadarResponse> {
    const { signals, riskLevel } = await this.detectSignals(userId)
    const recovery_plan = await this.generateRecoveryPlan(userId, riskLevel, signals)
    const today = new Date().toISOString().split('T')[0]

    const supabase = await createClient()
    const { data: alert } = await supabase
      .from('burnout_alerts')
      .upsert({
        user_id: userId,
        date: today,
        risk_level: riskLevel,
        signals,
        recovery_plan,
      }, { onConflict: 'user_id,date' })
      .select()
      .single()

    const history = await this.getHistory(userId)

    return {
      current_risk: riskLevel,
      signals,
      active_alert: alert as BurnoutAlert | null,
      history,
      recovery_plan,
    }
  }

  /** Get 30-day burnout history */
  static async getHistory(userId: string): Promise<{ date: string; risk_level: number }[]> {
    const supabase = await createClient()
    const since = new Date()
    since.setDate(since.getDate() - 30)

    const { data } = await supabase
      .from('burnout_alerts')
      .select('date, risk_level')
      .eq('user_id', userId)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: true })

    return (data ?? []) as { date: string; risk_level: number }[]
  }

  /** Acknowledge a burnout alert */
  static async acknowledge(userId: string, alertId: string): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from('burnout_alerts')
      .update({ acknowledged: true })
      .eq('id', alertId)
      .eq('user_id', userId)
  }
}
