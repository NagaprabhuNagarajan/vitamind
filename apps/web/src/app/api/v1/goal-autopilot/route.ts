import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { AutopilotService } from '@/features/goal-autopilot/services/autopilot.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const status = await AutopilotService.getStatus(user.id)
    return successResponse(status)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'goal-autopilot', tier: RateLimitTier.dashboard })))

export const POST = withLogging(withCors(withRateLimit(async (req: Request) => {
  try {
    const user = await requireAuth()
    const { action, goal_id } = await req.json()

    if (!goal_id) return errorResponse(new Error('goal_id is required'))

    if (action === 'enable') {
      const plan = await AutopilotService.enableAutopilot(user.id, goal_id)
      return successResponse(plan)
    }
    if (action === 'disable') {
      await AutopilotService.disableAutopilot(user.id, goal_id)
      return successResponse({ disabled: true })
    }
    if (action === 'adjust') {
      const plan = await AutopilotService.adjustPlan(user.id, goal_id)
      return successResponse(plan)
    }

    return errorResponse(new Error('Unknown action'))
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'goal-autopilot', tier: RateLimitTier.ai })))
