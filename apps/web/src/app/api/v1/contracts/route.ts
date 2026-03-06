import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { AccountabilityService } from '@/features/accountability/services/accountability.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const contracts = await AccountabilityService.getAll(user.id)
    return successResponse({ contracts })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'contracts', tier: RateLimitTier.dashboard })))

export const POST = withLogging(withCors(withRateLimit(async (req: Request) => {
  try {
    const user = await requireAuth()
    const body = await req.json()

    if (body.action === 'create') {
      const contract = await AccountabilityService.create(user.id, {
        title: body.title,
        type: body.type ?? 'custom',
        target_id: body.target_id,
        commitment: body.commitment,
        stakes: body.stakes,
        stake_amount_cents: body.stake_amount_cents,
        check_in_frequency: body.check_in_frequency ?? 'weekly',
        end_date: body.end_date,
        description: body.description,
      })
      return successResponse({ contract })
    }

    if (body.action === 'checkin') {
      if (!body.contract_id) return errorResponse(new Error('contract_id required'))
      const checkin = body.auto
        ? await AccountabilityService.autoCheckIn(user.id, body.contract_id)
        : await AccountabilityService.manualCheckIn(user.id, body.contract_id, body.met ?? false, body.notes)
      return successResponse({ checkin })
    }

    if (body.action === 'cancel') {
      if (!body.contract_id) return errorResponse(new Error('contract_id required'))
      await AccountabilityService.cancel(user.id, body.contract_id)
      return successResponse({ cancelled: true })
    }

    if (body.action === 'nudge') {
      if (!body.contract_id) return errorResponse(new Error('contract_id required'))
      const nudge = await AccountabilityService.getNudge(user.id, body.contract_id)
      return successResponse({ nudge })
    }

    return errorResponse(new Error('Unknown action'))
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'contracts', tier: RateLimitTier.ai })))
