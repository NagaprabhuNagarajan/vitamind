import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import {
  validateString, validateEnum, validateTime, validateArray, validateNumber,
  HABIT_FREQUENCIES,
} from '@/lib/api/validation'
import { HabitService } from '@/features/habits/services/habit.service'

interface Params { params: Promise<{ id: string }> }

export const PUT = withRateLimit(async (request: Request, context?: { params: Promise<Record<string, string>> }) => {
  try {
    const user = await requireAuth()
    const { id } = await (context as Params).params
    const body = await request.json()

    const validated = {
      title: validateString(body.title, 'title', { minLength: 1, maxLength: 200 }),
      description: validateString(body.description, 'description', { maxLength: 500 }),
      frequency: validateEnum(body.frequency, 'frequency', HABIT_FREQUENCIES),
      target_days: validateArray(body.target_days, 'target_days', {
        maxLength: 7,
        itemValidator: (item, i) => {
          const n = validateNumber(item, `target_days[${i}]`, { min: 0, max: 6, integer: true, required: true })
          return n as number
        },
      }),
      reminder_time: validateTime(body.reminder_time, 'reminder_time'),
    }

    const habit = await HabitService.update(id, user.id, validated)
    return successResponse(habit)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'habits', tier: RateLimitTier.standard })

export const DELETE = withRateLimit(async (_req: Request, context?: { params: Promise<Record<string, string>> }) => {
  try {
    const user = await requireAuth()
    const { id } = await (context as Params).params
    await HabitService.delete(id, user.id)
    return successResponse({ deleted: true })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'habits', tier: RateLimitTier.standard })
