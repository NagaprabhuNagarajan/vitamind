import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { LifeCoachService } from '@/features/life-coach/services/life-coach.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const force = new URL(request.url).searchParams.get('force') === 'true'
    const report = await LifeCoachService.generateReport(user.id, force)
    return successResponse(report)
  } catch (error) {
    console.error('[life-coach]', error instanceof Error ? error.message : error)
    return errorResponse(error)
  }
}, { routeKey: 'life-coach', tier: RateLimitTier.ai })))
