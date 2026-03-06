import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { validateUUID, validateEnum, validateDate, HABIT_LOG_STATUSES } from '@/lib/api/validation'
import { HabitService } from '@/features/habits/services/habit.service'

export { OPTIONS }

export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const habit_id = validateUUID(body.habit_id, 'habit_id', { required: true })!
    const status = validateEnum(body.status, 'status', HABIT_LOG_STATUSES, { required: true })!
    // Validate date format if provided (for future use), but logToday uses today's date internally
    validateDate(body.date, 'date')

    const log = await HabitService.logToday(habit_id, user.id, status as 'completed' | 'skipped')
    return successResponse(log, 201)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'habit-log', tier: RateLimitTier.standard })))
