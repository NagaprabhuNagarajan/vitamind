import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { validateString } from '@/lib/api/validation'
import { AutoCaptureService } from '@/features/auto-capture/services/auto-capture.service'

export { OPTIONS }

// GET /api/v1/auto-capture — returns suggestions (calendar + pattern-based)
export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const suggestions = await AutoCaptureService.getSuggestions(user.id)
    return successResponse(suggestions)
  } catch (error) {
    console.error('[auto-capture GET] error:', error instanceof Error ? error.message : error)
    return errorResponse(error)
  }
}, { routeKey: 'auto-capture-suggestions', tier: RateLimitTier.standard })))

// POST /api/v1/auto-capture — quick-log: parse free-form text into actions
export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const text = validateString(body.text, 'text', { required: true, minLength: 3, maxLength: 500 })!
    const result = await AutoCaptureService.quickLog(user.id, text)
    return successResponse(result)
  } catch (error) {
    console.error('[auto-capture POST] error:', error instanceof Error ? error.message : error)
    return errorResponse(error)
  }
}, { routeKey: 'auto-capture-quicklog', tier: RateLimitTier.ai })))
