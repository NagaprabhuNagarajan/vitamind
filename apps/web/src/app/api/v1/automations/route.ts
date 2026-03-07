import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse, Errors } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import {
  AutomationsService,
  TRIGGER_LABELS,
  ACTION_LABELS,
  type TriggerType,
  type ActionType,
} from '@/features/automations/services/automations.service'

export { OPTIONS }

const VALID_TRIGGERS: TriggerType[] = [
  'habit_streak_broken', 'task_overdue', 'goal_deadline_approaching',
  'momentum_low', 'burnout_high',
]
const VALID_ACTIONS: ActionType[] = ['create_task', 'send_notification', 'webhook']

export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const rules = await AutomationsService.getRules(user.id)
    return successResponse({ rules, trigger_labels: TRIGGER_LABELS, action_labels: ACTION_LABELS })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'automations-list', tier: RateLimitTier.standard })))

export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json() as Record<string, unknown>

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return errorResponse(Errors.badRequest('name is required'))

    const trigger_type = body.trigger_type as TriggerType
    if (!VALID_TRIGGERS.includes(trigger_type)) {
      return errorResponse(Errors.badRequest(`trigger_type must be one of: ${VALID_TRIGGERS.join(', ')}`))
    }

    const action_type = body.action_type as ActionType
    if (!VALID_ACTIONS.includes(action_type)) {
      return errorResponse(Errors.badRequest(`action_type must be one of: ${VALID_ACTIONS.join(', ')}`))
    }

    const rule = await AutomationsService.createRule(user.id, {
      name,
      trigger_type,
      trigger_config: (body.trigger_config as Record<string, unknown>) ?? {},
      action_type,
      action_config: (body.action_config as Record<string, unknown>) ?? {},
    })

    return successResponse(rule, 201)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'automations-create', tier: RateLimitTier.standard })))
