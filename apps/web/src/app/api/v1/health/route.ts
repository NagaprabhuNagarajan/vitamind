import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse, Errors } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { HealthService } from '@/features/health/services/health.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const days = Math.min(Number(searchParams.get('days') ?? 30), 365)

    const [entries, insights] = await Promise.all([
      HealthService.getEntries(user.id, { days }),
      HealthService.getInsights(user.id, days),
    ])

    return successResponse({ entries, insights })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'health-list', tier: RateLimitTier.standard })))

export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json() as Record<string, unknown>

    const numOrNull = (v: unknown) => (typeof v === 'number' && !isNaN(v) ? v : undefined)

    const mood = numOrNull(body.mood)
    if (mood !== undefined && (mood < 1 || mood > 5)) {
      return errorResponse(Errors.badRequest('mood must be between 1 and 5'))
    }

    const entry = await HealthService.upsertEntry(user.id, {
      date: typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : undefined,
      sleep_hours: numOrNull(body.sleep_hours),
      steps: numOrNull(body.steps),
      water_ml: numOrNull(body.water_ml),
      weight_kg: numOrNull(body.weight_kg),
      exercise_minutes: numOrNull(body.exercise_minutes),
      mood,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
    })

    return successResponse(entry, 201)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'health-upsert', tier: RateLimitTier.standard })))
