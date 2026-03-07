import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { BehavioralTrendsService } from '@/features/behavioral-trends/services/trends.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const result = await BehavioralTrendsService.getAnalysis(user.id)
    return successResponse(result)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'behavioral-trends', tier: RateLimitTier.dashboard })))
