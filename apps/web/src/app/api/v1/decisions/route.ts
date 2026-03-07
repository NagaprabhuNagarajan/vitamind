import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse, Errors } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { validateString, validateArray } from '@/lib/api/validation'
import { DecisionEngineService } from '@/features/decisions/services/decisions.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const history = await DecisionEngineService.getHistory(user.id)
    return successResponse(history)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'decisions-get', tier: RateLimitTier.standard })))

export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const question = validateString(body.question, 'question', { required: true, minLength: 5, maxLength: 500 })!
    const options = validateArray<string>(body.options, 'options', {
      required: true,
      itemValidator: (item, i) => {
        if (typeof item !== 'string' || !item.trim()) throw Errors.badRequest(`options[${i}] must be a non-empty string`)
        return item.trim()
      },
    })!

    if (options.length < 2) throw Errors.badRequest('At least 2 options are required')
    if (options.length > 5) throw Errors.badRequest('Maximum 5 options allowed')

    const decision = await DecisionEngineService.analyze(user.id, question, options)
    return successResponse(decision)
  } catch (error) {
    console.error('[decisions] error:', error instanceof Error ? error.message : error)
    return errorResponse(error)
  }
}, { routeKey: 'decisions-post', tier: RateLimitTier.ai })))
