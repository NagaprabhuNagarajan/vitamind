/**
 * Supabase Edge Function: compute-momentum
 *
 * Computes the daily Life Momentum Score for all active users.
 * Scheduled via pg_cron daily at midnight UTC.
 *
 * Deploy: supabase functions deploy compute-momentum
 * Schedule:
 *   select cron.schedule('compute-momentum', '0 0 * * *',
 *     $$select net.http_post(url := 'https://<project>.supabase.co/functions/v1/compute-momentum',
 *       headers := '{"Authorization":"Bearer <service_role_key>"}',
 *       body := '{}')$$);
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPushNotification } from '../_shared/send-notification.ts'

const WEIGHTS = { taskVelocity: 0.25, habitConsistency: 0.30, goalTrajectory: 0.25, overduePressure: 0.20 }

interface Components {
  taskVelocity: number
  habitConsistency: number
  goalTrajectory: number
  overduePressure: number
  burnoutRisk: number
}

async function computeForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  today: string,
  weekAgo: string,
): Promise<Components> {
  // Task velocity
  const [{ data: completedTasks }, { data: recentTasks }, { data: overdueTasks }] = await Promise.all([
    supabase.from('tasks').select('id').eq('user_id', userId).eq('status', 'completed').gte('completed_at', new Date(weekAgo).toISOString()),
    supabase.from('tasks').select('id').eq('user_id', userId).gte('created_at', new Date(weekAgo).toISOString()),
    supabase.from('tasks').select('id').eq('user_id', userId).in('status', ['todo', 'in_progress']).lt('due_date', today).not('due_date', 'is', null),
  ])

  const completed = completedTasks?.length ?? 0
  const created = Math.max(recentTasks?.length ?? 1, 1)
  const overdue = overdueTasks?.length ?? 0
  const taskVelocity = Math.max(0, Math.min(100, Math.round((completed / created) * 100) - overdue * 5))

  // Habit consistency
  const [{ data: activeHabits }, { data: habitLogs }] = await Promise.all([
    supabase.from('habits').select('id').eq('user_id', userId).eq('is_active', true),
    supabase.from('habit_logs').select('id').eq('user_id', userId).eq('status', 'completed').gte('date', weekAgo).lte('date', today),
  ])

  const habitCount = activeHabits?.length ?? 0
  const logsCount = habitLogs?.length ?? 0
  const totalPossible = habitCount * 7
  const habitConsistency = totalPossible > 0 ? Math.min(100, Math.round((logsCount / totalPossible) * 100)) : 50

  // Goal trajectory
  const { data: goals } = await supabase.from('goals').select('progress, target_date').eq('user_id', userId).eq('is_completed', false)
  let goalTrajectory = 50
  if (goals && goals.length > 0) {
    const now = new Date()
    const withDates = goals.filter((g: any) => g.target_date)
    if (withDates.length > 0) {
      const paceScores = withDates.map((g: any) => {
        const daysLeft = Math.max(1, Math.ceil((new Date(g.target_date).getTime() - now.getTime()) / 86400000))
        const dailyNeeded = (100 - (g.progress ?? 0)) / daysLeft
        return dailyNeeded <= 2 ? 80 : dailyNeeded <= 5 ? 50 : 20
      })
      goalTrajectory = Math.round(paceScores.reduce((a: number, b: number) => a + b, 0) / paceScores.length)
    } else {
      goalTrajectory = Math.min(100, Math.round(goals.reduce((s: number, g: any) => s + (g.progress ?? 0), 0) / goals.length))
    }
  }

  // Overdue pressure
  const overduePressure = Math.min(100, overdue * 15)

  // Burnout risk
  const burnoutRisk = Math.min(100, Math.round(
    overduePressure * 0.4 + (100 - habitConsistency) * 0.3 + (100 - taskVelocity) * 0.3
  ))

  return { taskVelocity, habitConsistency, goalTrajectory, overduePressure, burnoutRisk }
}

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: users } = await supabase.from('users').select('id')
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ computed: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString().split('T')[0]

    const fcmKey = Deno.env.get('FCM_SERVER_KEY')
    let computed = 0
    let errors = 0
    let notificationsSent = 0

    for (const user of users) {
      try {
        const c = await computeForUser(supabase, user.id, today, weekAgoStr)
        const score = Math.max(0, Math.min(100, Math.round(
          c.taskVelocity * WEIGHTS.taskVelocity +
          c.habitConsistency * WEIGHTS.habitConsistency +
          c.goalTrajectory * WEIGHTS.goalTrajectory +
          (100 - c.overduePressure) * WEIGHTS.overduePressure
        )))

        await supabase.from('momentum_snapshots').upsert({
          user_id: user.id,
          date: today,
          score,
          task_velocity: c.taskVelocity,
          habit_consistency: c.habitConsistency,
          goal_trajectory: c.goalTrajectory,
          overdue_pressure: c.overduePressure,
          burnout_risk: c.burnoutRisk,
        }, { onConflict: 'user_id,date' })

        computed++

        // ── Push Notifications ─────────────────────────────────────
        if (!fcmKey) continue

        // 1. Momentum drop alert (> 7 pts vs yesterday)
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        const { data: prevSnapshot } = await supabase
          .from('momentum_snapshots')
          .select('score')
          .eq('user_id', user.id)
          .eq('date', yesterdayStr)
          .single()

        if (prevSnapshot && prevSnapshot.score - score > 7) {
          const delta = prevSnapshot.score - score
          const ok = await sendPushNotification(supabase, user.id, {
            title: 'Momentum Alert',
            body: `Your momentum dropped ${delta} pts. One win can turn it around.`,
            data: { type: 'momentum_drop', delta: String(delta) },
          }, fcmKey)
          if (ok) notificationsSent++
        }

        // 2. Burnout risk alert (>= 65)
        if (c.burnoutRisk >= 65) {
          const ok = await sendPushNotification(supabase, user.id, {
            title: 'Burnout Warning',
            body: `Risk elevated at ${c.burnoutRisk}/100. Consider a lighter day.`,
            data: { type: 'burnout_risk', risk: String(c.burnoutRisk) },
          }, fcmKey)
          if (ok) notificationsSent++
        }

        // 3. Cascade alerts (unacknowledged events)
        const { data: cascadeEvents } = await supabase
          .from('cascade_events')
          .select('*, habits(title)')
          .eq('user_id', user.id)
          .eq('acknowledged', false)
          .limit(1)

        if (cascadeEvents && cascadeEvents.length > 0) {
          const evt = cascadeEvents[0]
          const habitTitle = evt.habits?.title ?? 'a habit'
          const goals = evt.affected_goals as Array<{ title?: string }> | null
          const goalTitle = goals?.[0]?.title ?? 'your goal'
          const ok = await sendPushNotification(supabase, user.id, {
            title: 'Cascade Alert',
            body: `Missing '${habitTitle}' is affecting '${goalTitle}'.`,
            data: { type: 'cascade_alert', eventId: evt.id },
          }, fcmKey)
          if (ok) notificationsSent++
        }
      } catch (err) {
        console.error(`[compute-momentum] Error for user ${user.id}:`, err)
        errors++
      }
    }

    console.log(`[compute-momentum] Done: computed=${computed}, errors=${errors}, notifications=${notificationsSent}`)
    return new Response(JSON.stringify({ computed, errors, notificationsSent }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[compute-momentum] Fatal:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
