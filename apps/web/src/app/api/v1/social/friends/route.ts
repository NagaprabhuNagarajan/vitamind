import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { validateString } from '@/lib/api/validation'
import { SocialService } from '@/features/social/services/social.service'

export { OPTIONS }

// GET /api/v1/social/friends — list connections (accepted + pending)
export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const connections = await SocialService.getConnections(user.id)
    return successResponse(connections)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'social-friends', tier: RateLimitTier.standard })))

// POST /api/v1/social/friends — send invite by email
export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const email = validateString(body.email, 'email', { required: true })!
    const result = await SocialService.sendInvite(user.id, email)
    return successResponse(result)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'social-invite', tier: RateLimitTier.standard })))
