import { requireAuth } from '@/lib/api/auth-guard'
import { successResponse, errorResponse, Errors } from '@/lib/api/errors'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'

export { OPTIONS }

/**
 * POST /api/v1/notifications
 *
 * Triggers the Supabase Edge Function that sends FCM reminders.
 * Body: { type: 'tasks' | 'habits' }
 *
 * This endpoint is intended for admin/cron use; in production the Edge Function
 * is scheduled directly via pg_cron in Supabase.
 */
export const POST = withLogging(withCors(async (request: Request) => {
  try {
    await requireAuth()

    const { type } = await request.json()
    if (!['tasks', 'habits'].includes(type)) {
      return errorResponse(Errors.badRequest('type must be "tasks" or "habits"'))
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return errorResponse(Errors.internal('Supabase env vars not configured'))
    }

    const fnUrl = `${supabaseUrl}/functions/v1/send-reminder`
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ type }),
    })

    const data = await res.json()
    return successResponse(data)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return errorResponse(Errors.unauthorized())
    }
    return errorResponse(Errors.internal())
  }
}))
