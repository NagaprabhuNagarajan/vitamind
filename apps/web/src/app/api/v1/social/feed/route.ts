import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { SocialService } from '@/features/social/services/social.service'

export { OPTIONS }

// GET /api/v1/social/feed — friend activity feed for today
export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const feed = await SocialService.getFriendFeed(user.id)
    return successResponse(feed)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'social-feed', tier: RateLimitTier.standard })))
