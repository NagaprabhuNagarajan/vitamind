import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { DecisionEngineService } from '@/features/decisions/services/decisions.service'

export { OPTIONS }

export const DELETE = withLogging(withCors(withRateLimit(async (_request: Request, { params }: { params: Promise<Record<string, string>> }) => {
  try {
    const user = await requireAuth()
    const { id } = await params
    await DecisionEngineService.deleteDecision(user.id, id)
    return successResponse({ deleted: true })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'decisions-delete', tier: RateLimitTier.standard })))
