import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { VoiceLogService } from '@/features/voice-log/services/voice-log.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const logs = await VoiceLogService.getRecent(user.id)
    return successResponse({ logs })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'voice-log', tier: RateLimitTier.dashboard })))

export const POST = withLogging(withCors(withRateLimit(async (req: Request) => {
  try {
    const user = await requireAuth()
    const { transcript, duration_ms } = await req.json()

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return errorResponse(new Error('Transcript is required'))
    }

    const result = await VoiceLogService.processTranscript(user.id, transcript.trim(), duration_ms)
    return successResponse(result)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'voice-log', tier: RateLimitTier.ai })))
