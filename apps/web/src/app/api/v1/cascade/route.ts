import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { CascadeService } from '@/features/cascade-intelligence/services/cascade.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const result = await CascadeService.getCascadeView(user.id)
    return successResponse(result)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'cascade', tier: RateLimitTier.dashboard })))

export const POST = withLogging(withCors(withRateLimit(async (req: Request) => {
  try {
    const user = await requireAuth()
    const { action, ...body } = await req.json()

    if (action === 'link') {
      const link = await CascadeService.linkHabitToGoal(user.id, body.habit_id, body.goal_id, body.impact_weight)
      return successResponse(link)
    }
    if (action === 'unlink') {
      await CascadeService.unlinkHabitFromGoal(user.id, body.link_id)
      return successResponse({ removed: true })
    }
    if (action === 'acknowledge') {
      await CascadeService.acknowledge(user.id, body.event_id)
      return successResponse({ acknowledged: true })
    }
    if (action === 'suggest-links') {
      const suggestions = await CascadeService.suggestLinks(user.id)
      return successResponse(suggestions)
    }

    return errorResponse(new Error('Unknown action'))
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'cascade', tier: RateLimitTier.ai })))
