import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { buildUserContext } from '@/features/ai/services/context'
import { buildInsightsPrompt } from '@/features/ai/services/prompt-builder'
import { complete } from '@/features/ai/services/ai-provider'
import { getCachedInsight, saveInsight } from '@/features/ai/services/cache'

export { OPTIONS }

export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const { force = false } = await request.json().catch(() => ({}))

    if (!force) {
      const cached = await getCachedInsight(user.id, 'productivity')
      if (cached) return successResponse({ insight: cached, cached: true })
    }

    const ctx = await buildUserContext(user.id)
    const prompt = buildInsightsPrompt(ctx)

    const insight = await complete({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 300,
      temperature: 0.5,
    })

    await saveInsight(user.id, 'productivity', insight)

    return successResponse({ insight, cached: false })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'ai-insights', tier: RateLimitTier.ai })))
