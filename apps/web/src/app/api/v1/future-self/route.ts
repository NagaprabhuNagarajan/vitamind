import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { validateString } from '@/lib/api/validation'
import { FutureSelfService } from '@/features/future-self/services/future-self.service'

export { OPTIONS }

// GET /api/v1/future-self — list all messages
export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const messages = await FutureSelfService.getMessages(user.id)
    return successResponse(messages)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'future-self-get', tier: RateLimitTier.standard })))

// POST /api/v1/future-self — create message with AI forecast
export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const message = validateString(body.message, 'message', { required: true, minLength: 10, maxLength: 2000 })!
    const deliverAt = validateString(body.deliver_at, 'deliver_at', { required: true })!

    // Validate date format and ensure it's in the future
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deliverAt)) {
      return errorResponse(new Error('deliver_at must be YYYY-MM-DD format'))
    }
    const today = new Date().toISOString().split('T')[0]
    if (deliverAt <= today) {
      return errorResponse(new Error('deliver_at must be a future date'))
    }

    const result = await FutureSelfService.createMessage(user.id, message, deliverAt)
    return successResponse(result)
  } catch (error) {
    console.error('[future-self POST] error:', error instanceof Error ? error.message : error)
    return errorResponse(error)
  }
}, { routeKey: 'future-self-create', tier: RateLimitTier.ai })))
