import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse, Errors } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { createClient } from '@/lib/supabase/server'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)

    const query = searchParams.get('q')?.trim()
    if (!query) {
      throw Errors.badRequest('q is required')
    }

    const limit = Math.min(50, Math.max(1, Math.floor(Number(searchParams.get('limit')) || 20)))

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('life_events')
      .select('*')
      .eq('user_id', user.id)
      .textSearch('title', query, { type: 'websearch' })
      .order('event_date', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return successResponse(data ?? [])
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'timeline-search', tier: RateLimitTier.standard })))
