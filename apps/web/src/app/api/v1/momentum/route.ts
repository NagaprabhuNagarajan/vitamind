import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { MomentumService } from '@/features/momentum/services/momentum.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()

    const [current, history] = await Promise.all([
      MomentumService.getCurrentScore(user.id),
      MomentumService.getHistory(user.id, 30),
    ])

    // Calculate trend vs last week
    const lastWeekSnapshot = history.find((s) => {
      const d = new Date(s.date)
      const now = new Date()
      const diffDays = Math.round((now.getTime() - d.getTime()) / 86400000)
      return diffDays >= 6 && diffDays <= 8
    })

    const delta = current && lastWeekSnapshot ? current.score - lastWeekSnapshot.score : 0
    const direction = delta > 2 ? 'up' : delta < -2 ? 'down' : 'stable'

    return successResponse({
      current,
      history,
      trend: { direction, delta },
    })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'momentum', tier: RateLimitTier.dashboard })))
