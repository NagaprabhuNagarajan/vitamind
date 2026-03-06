import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { LifeReviewService } from '@/features/life-review/services/review.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async (req: Request) => {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')

    if (month) {
      const review = await LifeReviewService.getReview(user.id, month)
      return successResponse({ review })
    }

    const reviews = await LifeReviewService.getAllReviews(user.id)
    return successResponse({ reviews })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'life-reviews', tier: RateLimitTier.dashboard })))

export const POST = withLogging(withCors(withRateLimit(async (req: Request) => {
  try {
    const user = await requireAuth()
    const { month } = await req.json()

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return errorResponse(new Error('Valid month (YYYY-MM) is required'))
    }

    const review = await LifeReviewService.generateReview(user.id, month)
    return successResponse({ review })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'life-reviews', tier: RateLimitTier.ai })))
