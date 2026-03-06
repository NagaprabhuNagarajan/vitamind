import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { BurnoutRadarService } from '@/features/burnout-radar/services/burnout-radar.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const result = await BurnoutRadarService.getRadar(user.id)
    return successResponse(result)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'burnout-radar', tier: RateLimitTier.dashboard })))

export const PUT = withLogging(withCors(withRateLimit(async (req: Request) => {
  try {
    const user = await requireAuth()
    const { alert_id } = await req.json()
    if (!alert_id) return errorResponse(new Error('alert_id is required'))
    await BurnoutRadarService.acknowledge(user.id, alert_id)
    return successResponse({ acknowledged: true })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'burnout-radar', tier: RateLimitTier.standard })))
