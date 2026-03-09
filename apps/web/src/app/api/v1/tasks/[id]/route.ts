import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import {
  validateString, validateEnum, validateDate, validateTime, validateUUID,
  TASK_STATUSES, TASK_PRIORITIES,
} from '@/lib/api/validation'
import { TaskService } from '@/features/tasks/services/task.service'

interface Params { params: Promise<Record<string, string>> }

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async (_req: Request, context: { params: Promise<Record<string, string>> }) => {
  try {
    const user = await requireAuth()
    const { id } = await (context as Params).params
    const task = await TaskService.getById(id, user.id)
    return successResponse(task)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'tasks', tier: RateLimitTier.standard })))

export const PUT = withLogging(withCors(withRateLimit(async (request: Request, context: { params: Promise<Record<string, string>> }) => {
  try {
    const user = await requireAuth()
    const { id } = await (context as Params).params
    const body = await request.json()

    const validated = {
      title: validateString(body.title, 'title', { minLength: 1, maxLength: 300 }),
      description: validateString(body.description, 'description', { maxLength: 1000 }),
      priority: validateEnum(body.priority, 'priority', TASK_PRIORITIES),
      status: validateEnum(body.status, 'status', TASK_STATUSES),
      due_date: validateDate(body.due_date, 'due_date'),
      due_time: validateTime(body.due_time, 'due_time'),
      goal_id: validateUUID(body.goal_id, 'goal_id'),
    }

    const task = await TaskService.update(id, user.id, validated)
    return successResponse(task)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'tasks', tier: RateLimitTier.standard })))

export const DELETE = withLogging(withCors(withRateLimit(async (_req: Request, context: { params: Promise<Record<string, string>> }) => {
  try {
    const user = await requireAuth()
    const { id } = await (context as Params).params
    await TaskService.delete(id, user.id)
    return successResponse({ deleted: true })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'tasks', tier: RateLimitTier.standard })))
