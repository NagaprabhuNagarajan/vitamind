import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { HabitStackingService } from '@/features/habit-stacking/services/stacking.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const stacks = await HabitStackingService.getStacks(user.id)
    const suggestions = await HabitStackingService.suggestStacks(user.id)
    return successResponse({ stacks, suggestions })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'habit-stacks', tier: RateLimitTier.dashboard })))

export const POST = withLogging(withCors(withRateLimit(async (req: Request) => {
  try {
    const user = await requireAuth()
    const { action, ...body } = await req.json()

    if (action === 'create') {
      const stack = await HabitStackingService.createStack(user.id, body.name, body.habit_ids, body.suggested_time)
      return successResponse(stack)
    }
    if (action === 'complete') {
      const completed = await HabitStackingService.completeStack(user.id, body.stack_id)
      return successResponse({ completed })
    }
    if (action === 'delete') {
      await HabitStackingService.deleteStack(user.id, body.stack_id)
      return successResponse({ deleted: true })
    }

    return errorResponse(new Error('Unknown action'))
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'habit-stacks', tier: RateLimitTier.standard })))
