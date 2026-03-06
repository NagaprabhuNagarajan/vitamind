import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { DecompositionService } from '@/features/smart-decomposition/services/decomposition.service'

export { OPTIONS }

export const POST = withLogging(withCors(withRateLimit(async (req: Request) => {
  try {
    const user = await requireAuth()
    const { task_id } = await req.json()
    if (!task_id) return errorResponse(new Error('task_id is required'))
    const result = await DecompositionService.decompose(user.id, task_id)
    return successResponse(result)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'task-decompose', tier: RateLimitTier.ai })))
