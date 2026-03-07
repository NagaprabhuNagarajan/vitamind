// Auto Capture: surfaces actionable suggestions from calendar events + quick-log text parsing.
// No new DB tables needed — suggestions are computed on-the-fly; quick-log writes to existing tables.

import { createAdminClient } from '@/lib/supabase/admin'
import { complete } from '@/features/ai/services/ai-provider'
import { listCalendarEvents, getValidAccessToken } from '@/features/calendar/services/google-calendar'

export interface CaptureSuggestion {
  id: string               // ephemeral — calendar_event_id or generated uuid
  source: 'calendar' | 'pattern'
  type: 'task' | 'habit_log' | 'health_entry'
  title: string
  description?: string
  due_date?: string        // YYYY-MM-DD
  due_time?: string        // HH:MM (24h)
  priority: 'low' | 'medium' | 'high'
  confidence: number       // 0–100
}

export interface QuickLogResult {
  actions_taken: string[]  // human-readable summaries of what was created
  tasks_created: number
  habits_logged: number
  health_entries_created: number
}

// ── Suggestions ────────────────────────────────────────────────────────────────

export class AutoCaptureService {
  static async getSuggestions(userId: string): Promise<CaptureSuggestion[]> {
    const supabase = createAdminClient()

    // 1. Fetch calendar connection
    const { data: conn } = await supabase
      .from('calendar_connections')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single()

    const calendarSuggestions: CaptureSuggestion[] = []

    if (conn) {
      try {
        const token = await getValidAccessToken(conn)
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 2)

        const events = await listCalendarEvents(
          token,
          now.toISOString(),
          tomorrow.toISOString(),
        )

        // Convert upcoming calendar events to task suggestions
        for (const ev of events.slice(0, 10)) {
          if (!ev.summary) continue
          const startDate = ev.start.includes('T') ? ev.start.split('T')[0] : ev.start
          const startTime = ev.start.includes('T')
            ? ev.start.split('T')[1].substring(0, 5)
            : undefined

          calendarSuggestions.push({
            id: `cal_${ev.id}`,
            source: 'calendar',
            type: 'task',
            title: `Prepare for: ${ev.summary}`,
            description: `Auto-suggested from Google Calendar event`,
            due_date: startDate,
            due_time: startTime,
            priority: 'medium',
            confidence: 70,
          })
        }
      } catch {
        // Calendar fetch failed — skip, no disruption
      }
    }

    // 2. Pattern-based suggestions: overdue habits not logged today
    const today = new Date().toISOString().split('T')[0]
    const { data: habits } = await supabase
      .from('habits')
      .select('id, title, frequency')
      .eq('user_id', userId)
      .eq('is_active', true)

    const { data: todayLogs } = await supabase
      .from('habit_logs')
      .select('habit_id')
      .eq('user_id', userId)
      .eq('date', today)

    const loggedHabitIds = new Set((todayLogs ?? []).map((l) => l.habit_id as string))
    const patternSuggestions: CaptureSuggestion[] = []

    for (const habit of habits ?? []) {
      if (!loggedHabitIds.has(habit.id)) {
        patternSuggestions.push({
          id: `habit_${habit.id}`,
          source: 'pattern',
          type: 'habit_log',
          title: `Log: ${habit.title}`,
          description: `Not logged yet today`,
          due_date: today,
          priority: 'low',
          confidence: 90,
        })
      }
    }

    return [...calendarSuggestions, ...patternSuggestions].slice(0, 15)
  }

  // ── Import a calendar event as a task ────────────────────────────────────────

  static async importCalendarEvent(
    userId: string,
    suggestion: Pick<CaptureSuggestion, 'title' | 'due_date' | 'due_time' | 'priority'>,
  ): Promise<void> {
    const supabase = createAdminClient()
    await supabase.from('tasks').insert({
      user_id: userId,
      title: suggestion.title,
      priority: suggestion.priority,
      status: 'todo',
      due_date: suggestion.due_date ?? null,
      due_time: suggestion.due_time ?? null,
    })
  }

  // ── Quick Log: parse free-form text and create entries ───────────────────────

  static async quickLog(userId: string, text: string): Promise<QuickLogResult> {
    const supabase = createAdminClient()

    // Fetch habit names for context
    const { data: habits } = await supabase
      .from('habits')
      .select('id, title')
      .eq('user_id', userId)
      .eq('is_active', true)

    const habitList = (habits ?? []).map((h) => `${h.id}: ${h.title}`).join('\n')
    const today = new Date().toISOString().split('T')[0]

    const prompt = `You are VitaMind's Quick Log parser. Parse the user's text and extract structured actions.

User text: "${text}"
Today's date: ${today}
User's habits (id: name):
${habitList || 'None'}

Extract any of:
- Tasks to create (title, priority low/medium/high, optional due_date YYYY-MM-DD)
- Habit completions (habit_id from the list above, status: completed/skipped)
- Health entries (sleep_hours, mood 1-5, exercise_minutes, steps, water_ml)

Respond JSON only:
{
  "tasks": [{"title": "...", "priority": "medium", "due_date": null}],
  "habit_logs": [{"habit_id": "...", "status": "completed"}],
  "health": {"sleep_hours": null, "mood": null, "exercise_minutes": null, "steps": null, "water_ml": null}
}`

    const raw = await complete({ prompt, maxTokens: 400, temperature: 0.1 })
    const parsed = JSON.parse(raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()) as {
      tasks?: Array<{ title: string; priority: string; due_date?: string | null }>
      habit_logs?: Array<{ habit_id: string; status: string }>
      health?: { sleep_hours?: number | null; mood?: number | null; exercise_minutes?: number | null; steps?: number | null; water_ml?: number | null }
    }

    const actions: string[] = []
    let tasksCreated = 0
    let habitsLogged = 0
    let healthCreated = 0

    // Insert tasks
    for (const t of parsed.tasks ?? []) {
      if (!t.title) continue
      await supabase.from('tasks').insert({
        user_id: userId,
        title: t.title,
        priority: (['low', 'medium', 'high', 'urgent'].includes(t.priority) ? t.priority : 'medium'),
        status: 'todo',
        due_date: t.due_date ?? null,
      })
      actions.push(`Created task: "${t.title}"`)
      tasksCreated++
    }

    // Log habits
    for (const hl of parsed.habit_logs ?? []) {
      if (!hl.habit_id) continue
      await supabase.from('habit_logs').upsert(
        { user_id: userId, habit_id: hl.habit_id, date: today, status: hl.status },
        { onConflict: 'habit_id,date' },
      )
      const habitName = (habits ?? []).find((h) => h.id === hl.habit_id)?.title ?? hl.habit_id
      actions.push(`Logged habit: "${habitName}" as ${hl.status}`)
      habitsLogged++
    }

    // Insert health entry
    const h = parsed.health ?? {}
    const hasHealth = Object.values(h).some((v) => v != null)
    if (hasHealth) {
      await supabase.from('health_entries').upsert(
        {
          user_id: userId,
          date: today,
          sleep_hours: h.sleep_hours ?? null,
          mood: h.mood ?? null,
          exercise_minutes: h.exercise_minutes ?? null,
          steps: h.steps ?? null,
          water_ml: h.water_ml ?? null,
        },
        { onConflict: 'user_id,date' },
      )
      actions.push('Recorded health entry')
      healthCreated++
    }

    return { actions_taken: actions, tasks_created: tasksCreated, habits_logged: habitsLogged, health_entries_created: healthCreated }
  }
}
