import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { Errors } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { createClient } from '@/lib/supabase/server'

export { OPTIONS }

/**
 * DELETE /api/v1/calendar/disconnect
 * Removes the calendar connection for the authenticated user.
 * Query param: ?provider=google (defaults to 'google')
 */
export const DELETE = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') ?? 'google'

    const supabase = await createClient()
    const { error: dbError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)

    if (dbError) {
      console.error('[Calendar Disconnect] DB error:', dbError)
      throw Errors.internal('Failed to remove calendar connection')
    }

    // Clear calendar_event_id from all tasks so they can be re-synced later
    await supabase
      .from('tasks')
      .update({ calendar_event_id: null })
      .eq('user_id', user.id)
      .not('calendar_event_id', 'is', null)

    return successResponse({ disconnected: true })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'calendar-disconnect', tier: RateLimitTier.dashboard })))
