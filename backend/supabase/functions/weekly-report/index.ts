/**
 * Supabase Edge Function: weekly-report
 *
 * Sends a weekly productivity summary email to opted-in users.
 * Scheduled via pg_cron every Sunday at 8:00 AM UTC.
 *
 * Deploy: supabase functions deploy weekly-report
 * Schedule (in Supabase dashboard SQL editor):
 *   select cron.schedule('weekly-report', '0 8 * * 0',
 *     $$select net.http_post(url := 'https://<project>.supabase.co/functions/v1/weekly-report',
 *       headers := '{"Authorization":"Bearer <service_role_key>"}',
 *       body := '{}')$$);
 *
 * Env vars: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Types ──────────────────────────────────────────────────────────────────

interface WeeklyStats {
  tasksCompleted: number
  tasksTotal: number
  habitsCompletionRate: number
  habitsDailyCompletions: number[]
  topStreak: { title: string; days: number } | null
  goalsProgress: { title: string; progress: number; delta: number }[]
}

interface UserRow {
  id: string
  email: string
  name: string
}

// ─── Email sending via Resend ───────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.error('[weekly-report] RESEND_API_KEY not set — skipping email')
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'VitaMind <reports@vitamind.app>',
        to,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[weekly-report] Resend error for ${to}: ${res.status} ${body}`)
      return false
    }

    return true
  } catch (err) {
    console.error(`[weekly-report] Failed to send email to ${to}:`, err)
    return false
  }
}

// ─── Stats collection ───────────────────────────────────────────────────────

async function fetchWeeklyStats(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  weekStart: string,
  weekEnd: string,
): Promise<WeeklyStats> {
  // Tasks completed vs total created/due in the past week
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status, completed_at')
    .eq('user_id', userId)
    .or(`created_at.gte.${weekStart},due_date.gte.${weekStart}`)
    .or(`created_at.lte.${weekEnd},due_date.lte.${weekEnd}`)

  const allTasks = tasks ?? []
  const tasksCompleted = allTasks.filter((t: any) => t.status === 'completed').length
  const tasksTotal = allTasks.length

  // Habit logs for the past 7 days — build a per-day completion count
  const { data: habitLogs } = await supabase
    .from('habit_logs')
    .select('date, status')
    .eq('user_id', userId)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .eq('status', 'completed')

  // Active habits count for rate calculation
  const { data: activeHabits } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)

  const activeCount = activeHabits?.length ?? 0
  const logs = habitLogs ?? []

  // Build 7-day array (index 0 = weekStart)
  const dailyCompletions: number[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    dailyCompletions.push(logs.filter((l: any) => l.date === dateStr).length)
  }

  const totalPossible = activeCount * 7
  const habitsCompletionRate = totalPossible > 0
    ? Math.round((logs.length / totalPossible) * 100)
    : 0

  // Current streaks — find each habit's consecutive completed days ending today
  const { data: habits } = await supabase
    .from('habits')
    .select('id, title')
    .eq('user_id', userId)
    .eq('is_active', true)

  let topStreak: { title: string; days: number } | null = null

  if (habits && habits.length > 0) {
    for (const habit of habits) {
      const { data: streakLogs } = await supabase
        .from('habit_logs')
        .select('date')
        .eq('habit_id', habit.id)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(60)

      let streak = 0
      const today = new Date(weekEnd)
      for (let i = 0; i < (streakLogs?.length ?? 0); i++) {
        const expected = new Date(today)
        expected.setDate(expected.getDate() - i)
        const expectedStr = expected.toISOString().split('T')[0]
        if (streakLogs![i].date === expectedStr) {
          streak++
        } else {
          break
        }
      }

      if (!topStreak || streak > topStreak.days) {
        topStreak = { title: habit.title, days: streak }
      }
    }
  }

  // Goals progress — compare current vs 7 days ago using ai_insights or just current
  const { data: goals } = await supabase
    .from('goals')
    .select('title, progress')
    .eq('user_id', userId)
    .eq('is_completed', false)
    .order('created_at', { ascending: false })
    .limit(5)

  const goalsProgress = (goals ?? []).map((g: any) => ({
    title: g.title,
    progress: g.progress,
    // Delta not easily tracked without snapshots — show 0 for now
    delta: 0,
  }))

  return {
    tasksCompleted,
    tasksTotal,
    habitsCompletionRate,
    habitsDailyCompletions: dailyCompletions,
    topStreak,
    goalsProgress,
  }
}

// ─── Email HTML template ────────────────────────────────────────────────────

function buildWeeklyReportHtml(stats: WeeklyStats, userName: string): string {
  const firstName = userName.split(' ')[0] || 'there'

  const streakHtml = stats.topStreak && stats.topStreak.days > 0
    ? `<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:16px;text-align:center;">
         <div style="font-size:28px;font-weight:700;color:#10B981;">${stats.topStreak.days} days</div>
         <div style="font-size:12px;color:#94A3B8;margin-top:4px;">Top streak: ${escapeHtml(stats.topStreak.title)}</div>
       </div>`
    : ''

  // Mini bar chart for habit completions (7 days)
  const maxCompletion = Math.max(...stats.habitsDailyCompletions, 1)
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const barsHtml = stats.habitsDailyCompletions.map((count, i) => {
    const height = Math.max(4, Math.round((count / maxCompletion) * 40))
    return `<div style="text-align:center;flex:1;">
      <div style="height:40px;display:flex;align-items:flex-end;justify-content:center;">
        <div style="width:16px;height:${height}px;background:linear-gradient(180deg,#6366F1,#A855F7);border-radius:4px;"></div>
      </div>
      <div style="font-size:10px;color:#64748B;margin-top:4px;">${dayLabels[i]}</div>
    </div>`
  }).join('')

  // Goals progress bars
  const goalsHtml = stats.goalsProgress.length > 0
    ? stats.goalsProgress.map((g) => `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:13px;color:#F1F5F9;">${escapeHtml(g.title)}</span>
          <span style="font-size:13px;color:#94A3B8;">${g.progress}%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
          <div style="width:${g.progress}%;height:100%;background:linear-gradient(90deg,#6366F1,#A855F7);border-radius:3px;"></div>
        </div>
      </div>`).join('')
    : '<p style="font-size:13px;color:#64748B;text-align:center;">No active goals this week.</p>'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>VitaMind Weekly Report</title>
</head>
<body style="margin:0;padding:0;background:#060810;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366F1,#A855F7);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
      <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">VitaMind</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;">Weekly Productivity Report</div>
    </div>

    <!-- Body -->
    <div style="background:#0F1117;border:1px solid rgba(255,255,255,0.06);border-top:none;border-radius:0 0 16px 16px;padding:24px;">

      <!-- Greeting -->
      <p style="font-size:15px;color:#F1F5F9;margin:0 0 20px;">
        Hi ${escapeHtml(firstName)}, here is your weekly productivity summary.
      </p>

      <!-- Stats cards -->
      <div style="display:flex;gap:12px;margin-bottom:20px;">
        <div style="flex:1;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#6366F1;">${stats.tasksCompleted}/${stats.tasksTotal}</div>
          <div style="font-size:12px;color:#94A3B8;margin-top:4px;">Tasks completed</div>
        </div>
        <div style="flex:1;background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.2);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#A855F7;">${stats.habitsCompletionRate}%</div>
          <div style="font-size:12px;color:#94A3B8;margin-top:4px;">Habit completion</div>
        </div>
      </div>

      <!-- Top streak -->
      ${streakHtml}

      ${streakHtml ? '<div style="height:20px;"></div>' : ''}

      <!-- Habit chart -->
      <div style="margin-bottom:20px;">
        <div style="font-size:13px;font-weight:600;color:#F1F5F9;margin-bottom:12px;">Habits this week</div>
        <div style="display:flex;gap:4px;background:rgba(255,255,255,0.03);border-radius:8px;padding:12px 8px 8px;">
          ${barsHtml}
        </div>
      </div>

      <!-- Goals progress -->
      <div style="margin-bottom:24px;">
        <div style="font-size:13px;font-weight:600;color:#F1F5F9;margin-bottom:12px;">Goals progress</div>
        ${goalsHtml}
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:8px;">
        <a href="https://app.vitamind.app/dashboard"
           style="display:inline-block;background:linear-gradient(135deg,#6366F1,#A855F7);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;">
          View your dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px 0 0;">
      <p style="font-size:11px;color:#475569;margin:0;">
        You are receiving this because you opted in to weekly reports.
      </p>
      <p style="font-size:11px;margin:6px 0 0;">
        <a href="https://app.vitamind.app/settings" style="color:#6366F1;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

/** Escape HTML special characters to prevent injection in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Main handler ───────────────────────────────────────────────────────────

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch all users who opted in to the weekly report
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email_weekly_report', true)

    if (usersError) {
      console.error('[weekly-report] Failed to fetch users:', usersError.message)
      return new Response(JSON.stringify({ error: usersError.message }), { status: 500 })
    }

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Calculate the date range for the past 7 days
    const now = new Date()
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() - 1) // yesterday
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 6) // 7 days total

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    let sent = 0
    let skipped = 0

    // Process users in batches to avoid overwhelming external APIs
    for (const user of users as UserRow[]) {
      try {
        const stats = await fetchWeeklyStats(supabase, user.id, weekStartStr, weekEndStr)

        // Skip users with zero activity — no value in an empty report
        if (stats.tasksTotal === 0 && stats.habitsCompletionRate === 0 && stats.goalsProgress.length === 0) {
          skipped++
          continue
        }

        const subject = `Your week: ${stats.tasksCompleted} tasks done, ${stats.habitsCompletionRate}% habits`
        const html = buildWeeklyReportHtml(stats, user.name || 'there')
        const ok = await sendEmail(user.email, subject, html)

        if (ok) {
          sent++
        } else {
          skipped++
        }
      } catch (err) {
        console.error(`[weekly-report] Error processing user ${user.id}:`, err)
        skipped++
      }
    }

    console.log(`[weekly-report] Done: sent=${sent}, skipped=${skipped}, total=${users.length}`)

    return new Response(JSON.stringify({ sent, skipped, total: users.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[weekly-report] Fatal error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
