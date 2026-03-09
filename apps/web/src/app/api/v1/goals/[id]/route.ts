import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { validateString, validateDate, validateNumber } from '@/lib/api/validation'
import { GoalService } from '@/features/goals/services/goal.service'

interface Params { params: Promise<Record<string, string>> }

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async (_req: Request, context: { params: Promise<Record<string, string>> }) => {
  try {
    const user = await requireAuth()
    const { id } = await (context as Params).params
    const goal = await GoalService.getById(id, user.id)
    return successResponse(goal)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'goals', tier: RateLimitTier.standard })))

export const PUT = withLogging(withCors(withRateLimit(async (request: Request, context: { params: Promise<Record<string, string>> }) => {
  try {
    const user = await requireAuth()
    const { id } = await (context as Params).params
    const body = await request.json()

    const validated = {
      title: validateString(body.title, 'title', { minLength: 1, maxLength: 200 }),
      description: validateString(body.description, 'description', { maxLength: 1000 }),
      target_date: validateDate(body.target_date, 'target_date'),
      progress: validateNumber(body.progress, 'progress', { min: 0, max: 100, integer: true }),
    }

    const goal = await GoalService.update(id, user.id, validated)
    return successResponse(goal)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'goals', tier: RateLimitTier.standard })))

export const DELETE = withLogging(withCors(withRateLimit(async (_req: Request, context: { params: Promise<Record<string, string>> }) => {
  try {
    const user = await requireAuth()
    const { id } = await (context as Params).params
    await GoalService.delete(id, user.id)
    return successResponse({ deleted: true })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'goals', tier: RateLimitTier.standard })))
