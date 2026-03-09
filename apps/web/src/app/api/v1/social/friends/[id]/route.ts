import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { SocialService } from '@/features/social/services/social.service'

export { OPTIONS }

// PUT /api/v1/social/friends/:id — accept incoming invite
export const PUT = withLogging(withCors(withRateLimit(async (
  _request: Request,
  context: { params: Promise<Record<string, string>> },
) => {
  try {
    const user = await requireAuth()
    const { id } = await context.params
    await SocialService.acceptInvite(user.id, id)
    return successResponse({ accepted: true })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'social-accept', tier: RateLimitTier.standard })))

// DELETE /api/v1/social/friends/:id — remove connection
export const DELETE = withLogging(withCors(withRateLimit(async (
  _request: Request,
  context: { params: Promise<Record<string, string>> },
) => {
  try {
    const user = await requireAuth()
    const { id } = await context.params
    await SocialService.removeConnection(user.id, id)
    return successResponse({ removed: true })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'social-remove', tier: RateLimitTier.standard })))
