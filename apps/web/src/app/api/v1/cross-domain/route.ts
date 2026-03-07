import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { FinanceService } from '@/features/finance/services/finance.service'
import { HealthService } from '@/features/health/services/health.service'
import { MomentumService } from '@/features/momentum/services/momentum.service'
import { complete } from '@/features/ai/services/ai-provider'
import { getCachedInsight, saveInsight } from '@/features/ai/services/cache'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    if (!force) {
      const cached = await getCachedInsight(user.id, 'cross_domain')
      if (cached) return successResponse({ insight: cached, cached: true })
    }

    const month = new Date().toISOString().slice(0, 7)

    // Fetch all domains in parallel — all non-critical
    const [financeSummary, healthInsights, momentum] = await Promise.allSettled([
      FinanceService.getMonthlySummary(user.id, month),
      HealthService.getInsights(user.id, 30),
      MomentumService.getCurrentScore(user.id),
    ])

    const finance = financeSummary.status === 'fulfilled' ? financeSummary.value : null
    const health = healthInsights.status === 'fulfilled' ? healthInsights.value : null
    const mom = momentum.status === 'fulfilled' ? momentum.value : null

    // Build cross-domain prompt
    const financeBlock = finance
      ? `Financial (${month}):
- Income: ₹${finance.total_income.toLocaleString('en-IN')} | Expenses: ₹${finance.total_expense.toLocaleString('en-IN')} | Net: ₹${finance.net.toLocaleString('en-IN')}
- Top expense: ${finance.top_expense_category ?? 'N/A'}
- Savings rate: ${finance.total_income > 0 ? Math.round(((finance.net) / finance.total_income) * 100) : 0}%`
      : 'Financial: No data yet.'

    const healthBlock = health
      ? `Health (last 30 days):
- Sleep: ${health.avg_sleep ?? 'N/A'} hrs/night (${health.sleep_trend})
- Steps: ${health.avg_steps?.toLocaleString('en-IN') ?? 'N/A'}/day
- Mood: ${health.avg_mood ?? 'N/A'}/5 (${health.mood_trend})
- Exercise: ${health.avg_exercise ?? 'N/A'} min/day
- Tracking streak: ${health.streak_days} days`
      : 'Health: No data yet.'

    const productivityBlock = mom
      ? `Productivity:
- Momentum: ${mom.score}/100 | Burnout risk: ${mom.burnout_risk}/100
- Task velocity: ${mom.task_velocity}/100 | Habit consistency: ${mom.habit_consistency}/100`
      : 'Productivity: No momentum data yet.'

    const prompt = `You are VitaMind's cross-domain life optimization engine. Analyse the user's data across three life domains and provide 3–5 highly specific, actionable insights that connect patterns across domains.

${financeBlock}

${healthBlock}

${productivityBlock}

Cross-domain analysis guidelines:
- Look for correlations: does exercise affect productivity? Does financial stress affect mood?
- Identify the biggest leverage point: which single change across all domains would have the widest positive impact?
- Be specific with numbers when referencing the data above
- Prioritise insights by impact: health → productivity → finance order if unsure

Respond in JSON only (no markdown):
{"insights":[{"title":"...","observation":"...","action":"...","domains":["health","productivity"]},...],"top_leverage":"one sentence about the single highest-impact change"}`

    let result: { insights: unknown[]; top_leverage: string } = {
      insights: [],
      top_leverage: 'Keep tracking your data across all domains to unlock personalised insights.',
    }

    try {
      const raw = await complete({ prompt, maxTokens: 600, temperature: 0.4 })
      const jsonStr = raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(jsonStr)
      if (Array.isArray(parsed.insights)) {
        result = parsed
      }
    } catch {
      // AI failed — return empty insights with a nudge
      result.insights = [
        { title: 'Start tracking', observation: 'Add financial and health data to unlock cross-domain insights.', action: 'Log your first expense and health entry today.', domains: ['finance', 'health'] },
      ]
    }

    await saveInsight(user.id, 'cross_domain', JSON.stringify(result), { month }).catch(() => {})

    return successResponse({ ...result, cached: false, finance_summary: finance, health_insights: health })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'cross-domain', tier: RateLimitTier.ai })))
