import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, paginatedResponse, successResponse } from '@/lib/api/errors'
import { parsePagination } from '@/lib/api/pagination'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { validateString, validateDate, validateNumber } from '@/lib/api/validation'
import { GoalService } from '@/features/goals/services/goal.service'

export const GET = withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const pagination = parsePagination(searchParams)
    const result = await GoalService.getAll(user.id, pagination)
    return paginatedResponse(result.data, { ...pagination, total: result.total })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'goals', tier: RateLimitTier.standard })

export const POST = withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const validated = {
      title: validateString(body.title, 'title', { minLength: 1, maxLength: 200, required: true }),
      description: validateString(body.description, 'description', { maxLength: 1000 }),
      target_date: validateDate(body.target_date, 'target_date'),
      progress: validateNumber(body.progress, 'progress', { min: 0, max: 100, integer: true }),
    }

    const goal = await GoalService.create(user.id, validated)
    return successResponse(goal, 201)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'goals', tier: RateLimitTier.standard })
