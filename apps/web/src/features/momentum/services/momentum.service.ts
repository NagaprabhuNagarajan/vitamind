import { createClient } from '@/lib/supabase/server'
import type { MomentumSnapshot, MomentumComponents } from '../types'

const WEIGHTS = {
  taskVelocity: 0.25,
  habitConsistency: 0.30,
  goalTrajectory: 0.25,
  overduePressure: 0.20,
}

export class MomentumService {
  /** Get today's snapshot or compute it on-demand */
  static async getCurrentScore(userId: string): Promise<MomentumSnapshot | null> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data: existing } = await supabase
      .from('momentum_snapshots')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (existing) return existing as MomentumSnapshot

    // Compute on-demand
    return this.computeAndStore(userId)
  }

  /** Get historical snapshots for the last N days */
  static async getHistory(userId: string, days = 30): Promise<MomentumSnapshot[]> {
    const supabase = await createClient()
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data } = await supabase
      .from('momentum_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: true })

    return (data ?? []) as MomentumSnapshot[]
  }

  /** Core computation: analyze tasks, habits, goals and produce a score */
  static async computeComponents(userId: string): Promise<MomentumComponents> {
    const supabase = await createClient()
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const weekAgo = sevenDaysAgo.toISOString().split('T')[0]

    // ── Task Velocity ─────────────────────────────────────────────────
    const [{ data: completedTasks }, { data: allRecentTasks }, { data: overdueTasks }] = await Promise.all([
      supabase
        .from('tasks')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('completed_at', sevenDaysAgo.toISOString()),
      supabase
        .from('tasks')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase
        .from('tasks')
        .select('id, due_date')
        .eq('user_id', userId)
        .in('status', ['todo', 'in_progress'])
        .lt('due_date', today)
        .not('due_date', 'is', null),
    ])

    const completed = completedTasks?.length ?? 0
    const created = Math.max(allRecentTasks?.length ?? 1, 1)
    const overdue = overdueTasks?.length ?? 0
    const taskVelocity = Math.max(0, Math.min(100, Math.round((completed / created) * 100) - overdue * 5))

    // ── Habit Consistency ─────────────────────────────────────────────
    const [{ data: activeHabits }, { data: habitLogs }] = await Promise.all([
      supabase.from('habits').select('id').eq('user_id', userId).eq('is_active', true),
      supabase.from('habit_logs').select('id').eq('user_id', userId).eq('status', 'completed').gte('date', weekAgo).lte('date', today),
    ])

    const habitCount = activeHabits?.length ?? 0
    const logsCompleted = habitLogs?.length ?? 0
    const totalPossible = habitCount * 7
    const habitConsistency = totalPossible > 0 ? Math.min(100, Math.round((logsCompleted / totalPossible) * 100)) : 50

    // ── Goal Trajectory ───────────────────────────────────────────────
    const { data: goals } = await supabase
      .from('goals')
      .select('progress, target_date, is_completed')
      .eq('user_id', userId)
      .eq('is_completed', false)

    let goalTrajectory = 50 // neutral if no goals
    if (goals && goals.length > 0) {
      const avgProgress = goals.reduce((s, g) => s + (g.progress ?? 0), 0) / goals.length
      // Goals with target dates: check if on pace
      const withDates = goals.filter((g) => g.target_date)
      if (withDates.length > 0) {
        const paceScores = withDates.map((g) => {
          const target = new Date(g.target_date!)
          const daysLeft = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 86400000))
          const remaining = 100 - (g.progress ?? 0)
          const dailyNeeded = remaining / daysLeft
          // If you need less than 2% per day, you're on track
          return dailyNeeded <= 2 ? 80 : dailyNeeded <= 5 ? 50 : 20
        })
        goalTrajectory = Math.round(paceScores.reduce((a, b) => a + b, 0) / paceScores.length)
      } else {
        goalTrajectory = Math.min(100, Math.round(avgProgress))
      }
    }

    // ── Overdue Pressure ──────────────────────────────────────────────
    const overduePressure = Math.min(100, overdue * 15)

    // ── Burnout Risk ──────────────────────────────────────────────────
    // Simple model: high overdue + low habit consistency + low velocity = burnout
    const burnoutRisk = Math.min(100, Math.round(
      (overduePressure * 0.4) +
      ((100 - habitConsistency) * 0.3) +
      ((100 - taskVelocity) * 0.3)
    ))

    return { taskVelocity, habitConsistency, goalTrajectory, overduePressure, burnoutRisk }
  }

  /** Compute and store today's snapshot */
  static async computeAndStore(userId: string): Promise<MomentumSnapshot | null> {
    const components = await this.computeComponents(userId)
    const today = new Date().toISOString().split('T')[0]

    const score = Math.round(
      components.taskVelocity * WEIGHTS.taskVelocity +
      components.habitConsistency * WEIGHTS.habitConsistency +
      components.goalTrajectory * WEIGHTS.goalTrajectory +
      (100 - components.overduePressure) * WEIGHTS.overduePressure
    )

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('momentum_snapshots')
      .upsert({
        user_id: userId,
        date: today,
        score: Math.max(0, Math.min(100, score)),
        task_velocity: components.taskVelocity,
        habit_consistency: components.habitConsistency,
        goal_trajectory: components.goalTrajectory,
        overdue_pressure: components.overduePressure,
        burnout_risk: components.burnoutRisk,
      }, { onConflict: 'user_id,date' })
      .select()
      .single()

    if (error) {
      console.error('[momentum] Failed to store snapshot:', error.message)
      return null
    }

    return data as MomentumSnapshot
  }
}
