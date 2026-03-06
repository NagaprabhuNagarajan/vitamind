import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, paginatedResponse, successResponse } from '@/lib/api/errors'
import { parsePagination } from '@/lib/api/pagination'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import {
  validateString, validateEnum, validateTime, validateArray, validateNumber,
  HABIT_FREQUENCIES,
} from '@/lib/api/validation'
import { HabitService } from '@/features/habits/services/habit.service'
import type { CreateHabitInput } from '@/features/habits/types'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const pagination = parsePagination(searchParams)
    const result = await HabitService.getAllWithStreaks(user.id, pagination)
    return paginatedResponse(result.data, { ...pagination, total: result.total })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'habits', tier: RateLimitTier.standard })))

export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const validated = {
      title: validateString(body.title, 'title', { minLength: 1, maxLength: 200, required: true }),
      description: validateString(body.description, 'description', { maxLength: 500 }),
      frequency: validateEnum(body.frequency, 'frequency', HABIT_FREQUENCIES, { required: true }),
      target_days: validateArray(body.target_days, 'target_days', {
        maxLength: 7,
        itemValidator: (item, i) => {
          const n = validateNumber(item, `target_days[${i}]`, { min: 0, max: 6, integer: true, required: true })
          return n as number
        },
      }),
      reminder_time: validateTime(body.reminder_time, 'reminder_time'),
    }

    const habit = await HabitService.create(user.id, validated as CreateHabitInput)
    return successResponse(habit, 201)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'habits', tier: RateLimitTier.standard })))
