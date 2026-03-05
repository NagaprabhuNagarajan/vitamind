import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, paginatedResponse, successResponse } from '@/lib/api/errors'
import { parsePagination } from '@/lib/api/pagination'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import {
  validateString, validateEnum, validateDate, validateUUID,
  TASK_STATUSES, TASK_PRIORITIES,
} from '@/lib/api/validation'
import { TaskService } from '@/features/tasks/services/task.service'
import type { TaskFilters } from '@/features/tasks/types'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const filters: TaskFilters = {
      status: (searchParams.get('status') as TaskFilters['status']) ?? undefined,
      priority: (searchParams.get('priority') as TaskFilters['priority']) ?? undefined,
      goal_id: searchParams.get('goal_id') ?? undefined,
      date: searchParams.get('date') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    }
    const pagination = parsePagination(searchParams)
    const result = await TaskService.getAll(user.id, filters, pagination)
    return paginatedResponse(result.data, { ...pagination, total: result.total })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'tasks', tier: RateLimitTier.standard })))

export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const validated = {
      title: validateString(body.title, 'title', { minLength: 1, maxLength: 300, required: true }),
      description: validateString(body.description, 'description', { maxLength: 1000 }),
      priority: validateEnum(body.priority, 'priority', TASK_PRIORITIES),
      status: validateEnum(body.status, 'status', TASK_STATUSES),
      due_date: validateDate(body.due_date, 'due_date'),
      goal_id: validateUUID(body.goal_id, 'goal_id'),
    }

    const task = await TaskService.create(user.id, validated)
    return successResponse(task, 201)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'tasks', tier: RateLimitTier.standard })))
