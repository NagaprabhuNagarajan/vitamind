import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse, Errors } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { validateUUID } from '@/lib/api/validation'
import { createClient } from '@/lib/supabase/server'

// Only manual events can be deleted — auto-generated ones are system-managed
const DELETABLE_EVENT_TYPES = ['note', 'milestone']

interface Params { params: Promise<{ id: string }> }

export { OPTIONS }

export const DELETE = withLogging(withCors(withRateLimit(async (_req: Request, context: { params: Promise<Record<string, string>> }) => {
  try {
    const user = await requireAuth()
    const { id } = await (context as Params).params

    validateUUID(id, 'id', { required: true })

    const supabase = await createClient()

    // Fetch the event first to verify ownership and type before deleting
    const { data: event, error: fetchError } = await supabase
      .from('life_events')
      .select('id, user_id, event_type')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !event) {
      throw Errors.notFound('Timeline event')
    }

    if (!DELETABLE_EVENT_TYPES.includes(event.event_type)) {
      throw Errors.badRequest(
        'Only manual events (note, milestone) can be deleted'
      )
    }

    const { error: deleteError } = await supabase
      .from('life_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      throw deleteError
    }

    return successResponse({ deleted: true })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'timeline', tier: RateLimitTier.dashboard })))
