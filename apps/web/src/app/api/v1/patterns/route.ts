import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { PatternOracleService } from '@/features/pattern-oracle/services/oracle.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const result = await PatternOracleService.getInsights(user.id)
    return successResponse(result)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'patterns', tier: RateLimitTier.dashboard })))

export const POST = withLogging(withCors(withRateLimit(async (req: Request) => {
  try {
    const user = await requireAuth()
    const { action, insight_id } = await req.json()

    if (action === 'dismiss' && insight_id) {
      await PatternOracleService.dismiss(user.id, insight_id)
      return successResponse({ dismissed: true })
    }
    if (action === 'refresh') {
      const result = await PatternOracleService.computeInsights(user.id)
      return successResponse(result)
    }

    return errorResponse(new Error('Unknown action'))
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'patterns', tier: RateLimitTier.ai })))
