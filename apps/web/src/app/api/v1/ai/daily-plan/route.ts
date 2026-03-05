import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { buildUserContext } from '@/features/ai/services/context'
import { buildDailyPlanPrompt } from '@/features/ai/services/prompt-builder'
import { complete } from '@/features/ai/services/ai-provider'
import { getCachedInsight, saveInsight } from '@/features/ai/services/cache'

export { OPTIONS }

export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const { force = false } = await request.json().catch(() => ({}))

    // Return cached plan unless caller forces a refresh
    if (!force) {
      const cached = await getCachedInsight(user.id, 'daily_plan')
      if (cached) {
        return successResponse({ plan: cached, cached: true, generated_at: new Date().toISOString() })
      }
    }

    const ctx = await buildUserContext(user.id)
    const prompt = buildDailyPlanPrompt(ctx)

    const plan = await complete({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 600,
      temperature: 0.6,
    })

    await saveInsight(user.id, 'daily_plan', plan, {
      model: process.env.AI_PROVIDER ?? 'openai',
      task_count: ctx.tasks.length,
      goal_count: ctx.goals.length,
    })

    return successResponse({ plan, cached: false, generated_at: new Date().toISOString() })
  } catch (error) {
    console.error('[daily-plan]', error instanceof Error ? `${error.message}\n${error.stack}` : error)
    // Surface AI provider errors as 502 so the client gets a useful message
    if (error instanceof Error && (error.message.startsWith('OpenAI error') || error.message.startsWith('Groq error'))) {
      return Response.json(
        { data: null, error: { message: 'AI service is temporarily unavailable. Please try again.' } },
        { status: 502 },
      )
    }
    return errorResponse(error)
  }
}, { routeKey: 'ai-daily-plan', tier: RateLimitTier.ai })))
