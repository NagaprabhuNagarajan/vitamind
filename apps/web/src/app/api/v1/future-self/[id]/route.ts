import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { FutureSelfService } from '@/features/future-self/services/future-self.service'

export { OPTIONS }

// DELETE /api/v1/future-self/:id
export const DELETE = withLogging(withCors(withRateLimit(async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  try {
    const user = await requireAuth()
    const { id } = await context.params
    await FutureSelfService.deleteMessage(user.id, id)
    return successResponse({ deleted: true })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'future-self-delete', tier: RateLimitTier.standard })))
