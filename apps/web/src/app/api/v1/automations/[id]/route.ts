import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { AutomationsService } from '@/features/automations/services/automations.service'

export { OPTIONS }

export const PUT = withLogging(withCors(withRateLimit(async (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => {
  try {
    const user = await requireAuth()
    const { id } = await context.params
    const body = await request.json() as Record<string, unknown>

    const updates: Parameters<typeof AutomationsService.updateRule>[2] = {}
    if (typeof body.name === 'string') updates.name = body.name.trim()
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active
    if (body.trigger_config && typeof body.trigger_config === 'object') {
      updates.trigger_config = body.trigger_config as Record<string, unknown>
    }
    if (body.action_config && typeof body.action_config === 'object') {
      updates.action_config = body.action_config as Record<string, unknown>
    }

    const rule = await AutomationsService.updateRule(user.id, id, updates)
    return successResponse(rule)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'automations-update', tier: RateLimitTier.standard })))

export const DELETE = withLogging(withCors(withRateLimit(async (
  _request: Request,
  context: { params: Promise<Record<string, string>> },
) => {
  try {
    const user = await requireAuth()
    const { id } = await context.params
    await AutomationsService.deleteRule(user.id, id)
    return successResponse({ deleted: true })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'automations-delete', tier: RateLimitTier.standard })))
