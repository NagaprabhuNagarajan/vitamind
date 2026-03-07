import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse, Errors } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { TimeFingerprintService } from '@/features/time-fingerprint/services/time-fingerprint.service'
import { complete } from '@/features/ai/services/ai-provider'
import {
  listCalendarEvents,
  getValidAccessToken,
  type CalendarEvent,
} from '@/features/calendar/services/google-calendar'
import { createClient } from '@/lib/supabase/server'

export { OPTIONS }

// Fetch the target date's calendar events
async function getCalendarEvents(userId: string, date: string): Promise<CalendarEvent[]> {
  try {
    const supabase = await createClient()
    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('access_token, refresh_token, token_expires_at, calendar_id')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .eq('sync_enabled', true)
      .single()

    if (!connection) return []

    const accessToken = await getValidAccessToken({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      token_expires_at: connection.token_expires_at,
    })

    const startOfDay = new Date(date + 'T00:00:00').toISOString()
    const endOfDay = new Date(date + 'T23:59:59').toISOString()

    return await listCalendarEvents(
      accessToken,
      startOfDay,
      endOfDay,
      connection.calendar_id ?? 'primary',
    )
  } catch {
    return []
  }
}

export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json() as Record<string, unknown>

    const title = (typeof body.title === 'string' ? body.title.trim() : '') || null
    if (!title) {
      return errorResponse(Errors.badRequest('title is required'))
    }

    const rawPriority = typeof body.priority === 'string' ? body.priority : 'medium'
    const priority = ['low', 'medium', 'high', 'urgent'].includes(rawPriority) ? rawPriority : 'medium'

    const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : new Date().toISOString().split('T')[0]

    const estimatedMinutes = typeof body.estimated_minutes === 'number'
      ? Math.min(Math.max(body.estimated_minutes, 5), 480)
      : null

    // Fetch Time Fingerprint and calendar in parallel — both are non-critical
    const [fingerprintResult, calendarEvents] = await Promise.all([
      TimeFingerprintService.getProfile(user.id).catch(() => ({ profile: null, has_enough_data: false })),
      getCalendarEvents(user.id, date),
    ])

    const fp = fingerprintResult.profile

    // Default slots: use peak hours from profile, or hardcoded fallbacks
    const fallbackSlots = [
      { time: '09:00', label: '9:00 AM', reason: 'Standard morning focus block' },
      { time: '14:00', label: '2:00 PM', reason: 'Afternoon work session' },
      { time: '17:00', label: '5:00 PM', reason: 'End-of-day wrap-up' },
    ]
    const defaultSlots = fp && fp.peak_hours && fp.peak_hours.length > 0
      ? fp.peak_hours.slice(0, 3).map((h) => ({
          time: `${String(h).padStart(2, '0')}:00`,
          label: `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`,
          reason: 'Your peak productivity hour',
        }))
      : fallbackSlots

    // Build AI prompt
    let fingerprintBlock = fp && fp.peak_hours?.length
      ? `\nUser's productivity profile:\n- Peak hours: ${fp.peak_hours.map((h) => `${h}:00`).join(', ')}\n- Most productive window: ${fp.most_productive_window}\n- Best day: ${fp.best_day}`
      : '\nNo productivity profile yet — use standard 9am-6pm hours.'

    let calendarBlock = '\nNo calendar connected.'
    if (calendarEvents.length > 0) {
      const busy = calendarEvents
        .filter((e) => !e.allDay)
        .map((e) => {
          const s = new Date(e.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          const en = new Date(e.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          return `  - [${s} – ${en}] ${e.summary}`
        }).join('\n')
      calendarBlock = busy
        ? `\nCalendar events on ${date} (BLOCKED):\n${busy}`
        : `\nNo blocking calendar events on ${date}.`
    }

    const durationNote = estimatedMinutes
      ? `The task takes ~${estimatedMinutes} minutes.`
      : 'Assume the task takes 30–60 minutes.'

    const prompt = `You are VitaMind's smart scheduling engine.

Suggest exactly 3 optimal time slots for this task on ${date}:
Task: "${title}" (priority: ${priority})
${durationNote}
${fingerprintBlock}
${calendarBlock}

Rules:
- Never overlap with calendar events above
- Prioritise peak hours for high/urgent priority tasks
- Spread suggestions across different parts of the day

Respond in this exact JSON format only (no markdown):
{"slots":[{"time":"09:00","label":"9:00 AM","reason":"Your peak hour"},{"time":"14:00","label":"2:00 PM","reason":"Free window"},{"time":"17:00","label":"5:00 PM","reason":"Wrap-up time"}]}`

    // Try AI — always fall back to defaults if anything fails
    let slots = defaultSlots
    try {
      const raw = await complete({ prompt, maxTokens: 250, temperature: 0.2 })
      const jsonStr = raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(jsonStr) as { slots?: unknown }
      if (Array.isArray(parsed.slots) && parsed.slots.length > 0) {
        slots = (parsed.slots as typeof defaultSlots).slice(0, 3)
      }
    } catch {
      // AI failed or returned invalid JSON — use defaults
    }

    return successResponse({
      task: title,
      date,
      slots,
      used_fingerprint: !!fp,
      used_calendar: calendarEvents.length > 0,
    })
  } catch (error) {
    console.error('[smart-schedule] Unhandled error:', error instanceof Error ? error.message : error)
    return errorResponse(error)
  }
}, { routeKey: 'smart-schedule', tier: RateLimitTier.ai })))
