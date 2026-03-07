import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { validateString } from '@/lib/api/validation'
import { LifeSimulationService } from '@/features/life-simulation/services/life-simulation.service'

export { OPTIONS }

export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const scenario = validateString(body.scenario, 'scenario', { required: true, minLength: 5, maxLength: 500 })!

    const result = await LifeSimulationService.simulate(user.id, scenario)
    return successResponse(result)
  } catch (error) {
    console.error('[life-simulation] error:', error instanceof Error ? error.message : error)
    return errorResponse(error)
  }
}, { routeKey: 'life-simulation', tier: RateLimitTier.ai })))
