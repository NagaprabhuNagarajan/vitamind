import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, paginatedResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { validateString, validateEnum, validateDate } from '@/lib/api/validation'
import { createClient } from '@/lib/supabase/server'

export { OPTIONS }

// Manual event types that users can create and delete directly.
// Auto-generated events (task_completed, habit_streak, etc.) are system-managed.
const MANUAL_EVENT_TYPES = ['note', 'milestone'] as const

export const GET = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, Math.floor(Number(searchParams.get('page')) || 1))
    const limit = Math.min(50, Math.max(1, Math.floor(Number(searchParams.get('limit')) || 20)))
    const type = searchParams.get('type') ?? undefined
    const from = searchParams.get('from') ?? undefined
    const to = searchParams.get('to') ?? undefined

    // Validate optional filters when provided
    if (type !== undefined) {
      validateString(type, 'type', { required: true })
    }
    if (from !== undefined) {
      validateDate(from, 'from', { required: true })
    }
    if (to !== undefined) {
      validateDate(to, 'to', { required: true })
    }

    const supabase = await createClient()
    const offset = (page - 1) * limit

    // Build the query with optional filters applied conditionally
    let query = supabase
      .from('life_events')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('event_type', type)
    }
    if (from) {
      query = query.gte('event_date', from)
    }
    if (to) {
      query = query.lte('event_date', to)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      throw error
    }

    return paginatedResponse(data ?? [], {
      page,
      limit,
      total: count ?? 0,
    })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'timeline', tier: RateLimitTier.standard })))

export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const title = validateString(body.title, 'title', {
      minLength: 1,
      maxLength: 200,
      required: true,
    })

    const description = validateString(body.description, 'description', {
      maxLength: 1000,
    })

    const eventType = validateEnum(body.event_type, 'event_type', MANUAL_EVENT_TYPES, {
      required: true,
    })

    // Default to today when no date is provided
    const eventDate = validateDate(body.event_date, 'event_date') ??
      new Date().toISOString().split('T')[0]

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('life_events')
      .insert({
        user_id: user.id,
        title,
        description: description ?? null,
        event_type: eventType,
        event_date: eventDate,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return successResponse(data, 201)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'timeline', tier: RateLimitTier.dashboard })))
