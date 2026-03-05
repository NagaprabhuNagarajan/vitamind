/**
 * Supabase Edge Function: send-reminder
 *
 * Invoked by a Supabase pg_cron job or manually via HTTP.
 * Queries for tasks due within the next hour and habits not yet completed today,
 * then sends FCM push notifications to the relevant users.
 *
 * Deploy: supabase functions deploy send-reminder
 * Schedule (in Supabase dashboard SQL editor):
 *   select cron.schedule('task-reminders', '0 * * * *',
 *     $$select net.http_post(url := 'https://<project>.supabase.co/functions/v1/send-reminder',
 *       headers := '{"Authorization":"Bearer <service_role_key>"}',
 *       body := '{"type":"tasks"}')$$);
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FCM_ENDPOINT = 'https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send'

serve(async (req) => {
  try {
    const { type = 'tasks' } = await req.json().catch(() => ({ type: 'tasks' }))

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const fcmKey = Deno.env.get('FCM_SERVER_KEY')
    if (!fcmKey) return new Response('FCM_SERVER_KEY not set', { status: 500 })

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString()

    let recipients: Array<{ userId: string; title: string; body: string }> = []

    if (type === 'tasks') {
      // Tasks due within the next hour, not yet completed
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, user_id, due_date')
        .neq('status', 'completed')
        .lte('due_date', oneHourLater.split('T')[0])
        .gte('due_date', todayStr)

      if (tasks) {
        recipients = tasks.map((t: any) => ({
          userId: t.user_id,
          title: 'Task due soon',
          body: t.title,
        }))
      }
    } else if (type === 'habits') {
      // Habits not logged today
      const { data: habits } = await supabase
        .from('habits')
        .select('id, title, user_id')
        .eq('is_active', true)

      const { data: logs } = await supabase
        .from('habit_logs')
        .select('habit_id')
        .eq('date', todayStr)
        .eq('status', 'completed')

      const loggedIds = new Set((logs ?? []).map((l: any) => l.habit_id))
      const pending = (habits ?? []).filter((h: any) => !loggedIds.has(h.id))

      recipients = pending.map((h: any) => ({
        userId: h.user_id,
        title: 'Habit reminder',
        body: `Don't forget: ${h.title}`,
      }))
    }

    // Fetch FCM tokens for the relevant users
    const userIds = [...new Set(recipients.map((r) => r.userId))]
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    const { data: users } = await supabase
      .from('users')
      .select('id, fcm_token')
      .in('id', userIds)
      .not('fcm_token', 'is', null)

    const tokenMap = new Map((users ?? []).map((u: any) => [u.id, u.fcm_token]))

    let sent = 0
    for (const r of recipients) {
      const token = tokenMap.get(r.userId)
      if (!token) continue

      await fetch(`https://fcm.googleapis.com/fcm/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${fcmKey}`,
        },
        body: JSON.stringify({
          to: token,
          notification: { title: r.title, body: r.body },
          data: { type, userId: r.userId },
        }),
      })
      sent++
    }

    return new Response(JSON.stringify({ sent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
