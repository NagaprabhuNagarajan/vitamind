import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { Errors } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import {
  getValidAccessToken,
  refreshAccessToken,
  listCalendarEvents,
} from '@/features/calendar/services/google-calendar'
import { createClient } from '@/lib/supabase/server'

export { OPTIONS }

/**
 * POST /api/v1/calendar/import
 * Pulls upcoming events from Google Calendar and creates tasks in VitaMind.
 * Skips events already imported (matched by calendar_event_id).
 * Only imports events from today through the next 7 days.
 */
export const POST = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Fetch Google Calendar connection
    const { data: connection, error: connError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single()

    if (connError || !connection) {
      throw Errors.badRequest('No Google Calendar connection found. Please connect first.')
    }

    // Get a valid access token
    let accessToken: string
    try {
      accessToken = await getValidAccessToken({
        access_token: connection.access_token,
        refresh_token: connection.refresh_token,
        token_expires_at: connection.token_expires_at,
      })

      // Persist refreshed token if needed
      if (accessToken !== connection.access_token && connection.refresh_token) {
        const refreshed = await refreshAccessToken(connection.refresh_token)
        const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        await supabase
          .from('calendar_connections')
          .update({
            access_token: refreshed.access_token,
            token_expires_at: newExpiry,
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id)
      }
    } catch {
      throw Errors.badRequest('Calendar token expired. Please reconnect your calendar.')
    }

    // Fetch events for the next 7 days
    const now = new Date()
    const timeMin = now.toISOString()
    const weekLater = new Date(now)
    weekLater.setDate(weekLater.getDate() + 7)
    const timeMax = weekLater.toISOString()

    const calendarId = connection.calendar_id ?? 'primary'
    const events = await listCalendarEvents(accessToken, timeMin, timeMax, calendarId)

    if (events.length === 0) {
      return successResponse({ imported: 0, message: 'No upcoming events found in the next 7 days.' })
    }

    // Find which events are already imported (by calendar_event_id)
    const eventIds = events.map((e) => e.id)
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('calendar_event_id')
      .eq('user_id', user.id)
      .in('calendar_event_id', eventIds)

    const alreadyImported = new Set(
      (existingTasks ?? []).map((t) => t.calendar_event_id),
    )

    // Import new events as tasks
    const newEvents = events.filter((e) => !alreadyImported.has(e.id))

    if (newEvents.length === 0) {
      return successResponse({ imported: 0, message: 'All upcoming events are already imported.' })
    }

    let imported = 0
    const errors: string[] = []

    for (const event of newEvents) {
      try {
        // Use the event start date as the task due date
        const dueDate = event.allDay
          ? event.start
          : event.start.split('T')[0]

        const { error: insertError } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title: event.summary,
            description: `Imported from Google Calendar`,
            due_date: dueDate,
            status: 'todo',
            priority: 'medium',
            calendar_event_id: event.id,
          })

        if (insertError) throw insertError
        imported++
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`"${event.summary}": ${message}`)
      }
    }

    return successResponse({
      imported,
      total: newEvents.length,
      skipped: alreadyImported.size,
      errors: errors.length > 0 ? errors : undefined,
      message: `Imported ${imported} event${imported === 1 ? '' : 's'} as tasks.`,
    })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'calendar-import', tier: RateLimitTier.dashboard })))
