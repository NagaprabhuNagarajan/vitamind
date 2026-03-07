import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { AutoCaptureService } from '@/features/auto-capture/services/auto-capture.service'

export { OPTIONS }

// POST /api/v1/auto-capture/import — import a single calendar suggestion as a task
export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json() as {
      title: string
      due_date?: string
      due_time?: string
      priority?: 'low' | 'medium' | 'high'
    }

    if (!body.title) {
      return errorResponse(new Error('title is required'))
    }

    await AutoCaptureService.importCalendarEvent(user.id, {
      title: body.title,
      due_date: body.due_date,
      due_time: body.due_time,
      priority: body.priority ?? 'medium',
    })

    return successResponse({ imported: true })
  } catch (error) {
    console.error('[auto-capture/import] error:', error instanceof Error ? error.message : error)
    return errorResponse(error)
  }
}, { routeKey: 'auto-capture-import', tier: RateLimitTier.standard })))
