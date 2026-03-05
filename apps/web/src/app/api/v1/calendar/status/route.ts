import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { createClient } from '@/lib/supabase/server'

export { OPTIONS }

/**
 * GET /api/v1/calendar/status
 * Returns the current calendar connection status for the authenticated user.
 */
export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('provider, sync_enabled, last_synced_at, calendar_id, created_at')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single()

    if (!connection) {
      return successResponse({ connected: false, provider: null })
    }

    return successResponse({
      connected: true,
      provider: connection.provider,
      syncEnabled: connection.sync_enabled,
      lastSyncedAt: connection.last_synced_at,
      calendarId: connection.calendar_id,
      connectedAt: connection.created_at,
    })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'calendar-status', tier: RateLimitTier.dashboard })))
