import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { FocusService } from '@/features/focus-contracts/services/focus.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const [active, recent, stats] = await Promise.all([
      FocusService.getActive(user.id),
      FocusService.getRecent(user.id),
      FocusService.getStats(user.id),
    ])
    return successResponse({ active, recent, stats })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'focus', tier: RateLimitTier.dashboard })))

export const POST = withLogging(withCors(withRateLimit(async (req: Request) => {
  try {
    const user = await requireAuth()
    const body = await req.json()

    if (body.action === 'suggest') {
      const suggestions = await FocusService.suggestTasks(user.id, body.duration_minutes ?? 25)
      return successResponse({ suggestions })
    }

    if (body.action === 'start') {
      const block = await FocusService.startBlock(
        user.id,
        body.planned_tasks ?? [],
        body.duration_minutes ?? 25,
      )
      return successResponse({ block })
    }

    if (body.action === 'end') {
      if (!body.block_id) return errorResponse(new Error('block_id required'))
      const block = await FocusService.endBlock(
        user.id,
        body.block_id,
        body.completed_tasks ?? [],
        body.interruptions ?? 0,
      )
      return successResponse({ block })
    }

    return errorResponse(new Error('Unknown action'))
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'focus', tier: RateLimitTier.ai })))
