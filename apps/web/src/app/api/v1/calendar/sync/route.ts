import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { Errors } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import {
  createCalendarEvent,
  getValidAccessToken,
  refreshAccessToken,
} from '@/features/calendar/services/google-calendar'
import { createClient } from '@/lib/supabase/server'

export { OPTIONS }

/**
 * POST /api/v1/calendar/sync
 * Syncs unsynced tasks (those with due_date but no calendar_event_id) to Google Calendar.
 * Returns the count of newly synced events.
 */
export const POST = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Fetch the user's Google Calendar connection
    const { data: connection, error: connError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single()

    if (connError || !connection) {
      throw Errors.badRequest('No Google Calendar connection found. Please connect first.')
    }

    if (!connection.sync_enabled) {
      throw Errors.badRequest('Calendar sync is disabled.')
    }

    // Get a valid access token, refreshing if needed
    let accessToken: string
    try {
      accessToken = await getValidAccessToken({
        access_token: connection.access_token,
        refresh_token: connection.refresh_token,
        token_expires_at: connection.token_expires_at,
      })

      // If the token was refreshed, persist the new token
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

    // Fetch tasks with due dates that have not been synced yet
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, description, due_date, status')
      .eq('user_id', user.id)
      .not('due_date', 'is', null)
      .is('calendar_event_id', null)
      .in('status', ['todo', 'in_progress'])

    if (taskError) {
      console.error('[Calendar Sync] Task fetch error:', taskError)
      throw Errors.internal('Failed to fetch tasks for sync')
    }

    if (!tasks || tasks.length === 0) {
      return successResponse({ synced: 0, message: 'No tasks to sync.' })
    }

    // Cap the number of events created per sync to prevent abuse
    const MAX_SYNC_BATCH = 50
    const batch = tasks.slice(0, MAX_SYNC_BATCH)
    const calendarId = connection.calendar_id ?? 'primary'

    let synced = 0
    const errors: string[] = []

    // Create calendar events sequentially to respect API rate limits
    for (const task of batch) {
      try {
        const eventId = await createCalendarEvent(accessToken, {
          summary: task.title,
          description: task.description ?? undefined,
          start: task.due_date,
          end: task.due_date,
        }, calendarId)

        // Store the event ID back on the task
        await supabase
          .from('tasks')
          .update({ calendar_event_id: eventId })
          .eq('id', task.id)

        synced++
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Task "${task.title}": ${message}`)
      }
    }

    // Update the last synced timestamp
    await supabase
      .from('calendar_connections')
      .update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    return successResponse({
      synced,
      total: batch.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'calendar-sync', tier: RateLimitTier.dashboard })))
