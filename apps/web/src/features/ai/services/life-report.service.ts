import { createClient } from '@/lib/supabase/server'
import { complete } from '@/features/ai/services/ai-provider'
import { getCachedInsight, saveInsight } from '@/features/ai/services/cache'
import { MomentumService } from '@/features/momentum/services/momentum.service'
import { PatternOracleService } from '@/features/pattern-oracle/services/oracle.service'
import { generateTrajectoryReport } from '@/features/trajectory/services/trajectory.service'
import type { LifeDomain } from '@/lib/types'
import type { DomainVelocity } from '@/features/trajectory/services/trajectory.service'

export interface LifeReport {
  greeting: string          // AI-generated warm morning greeting
  momentumScore: number
  momentumTrend: number[]   // last 7 days, oldest first
  burnoutRisk: 'low' | 'medium' | 'high'
  topInsight: string
  highestImpactAction: {
    action: string
    domain: LifeDomain
    projectedImpact: string
  }
  domains: DomainVelocity[]
  healthSummary: string | null
  generatedAt: string
}

export class LifeReportService {
  static async generateReport(userId: string, force = false): Promise<LifeReport> {
    if (!force) {
      const cached = await getCachedInsight(userId, 'life_report')
      if (cached) {
        try {
          return JSON.parse(cached) as LifeReport
        } catch { /* fall through */ }
      }
    }

    const supabase = await createClient()

    // Parallel data fetch — all failures fall back to null
    const [
      { data: user },
      { data: healthEntry },
      momentumNow,
      momentumHistory,
      patternsResult,
      trajectoryResult,
    ] = await Promise.all([
      supabase.from('users').select('name').eq('id', userId).single(),
      supabase
        .from('health_entries')
        .select('sleep_hours, energy_level, mood, notes')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
        .then((r) => r)
        .catch(() => ({ data: null })),
      MomentumService.getCurrentScore(userId).catch(() => null),
      MomentumService.getHistory(userId, 7).catch(() => []),
      PatternOracleService.getInsights(userId).catch(() => null),
      generateTrajectoryReport(userId, false).catch(() => null),
    ])

    const userName = (user as { name?: string } | null)?.name ?? 'there'
    const momentumScore = momentumNow?.score ?? 50
    const momentumTrend = (momentumHistory ?? [])
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => s.score)
    const topInsight = patternsResult?.insights?.[0]?.description ?? 'Keep building your streaks — consistency compounds.'

    // Burnout risk: declining momentum for 3+ days = high, flat = medium, rising = low
    const burnoutRisk = computeBurnoutRisk(momentumTrend)

    // Health summary from latest entry
    const healthSummary = buildHealthSummary(healthEntry as HealthEntryRow | null)

    // Highest Impact Action from trajectory
    const highestImpactAction = trajectoryResult?.highestImpactAction ?? {
      action: 'Complete your top priority task today',
      domain: 'career' as LifeDomain,
      projectedImpact: '+3% momentum',
    }

    const domains = trajectoryResult?.domains ?? []

    // AI greeting — short, warm, personalised
    const trendWord = momentumTrend.length >= 2
      ? momentumTrend[momentumTrend.length - 1] > momentumTrend[momentumTrend.length - 2]
        ? 'rising'
        : momentumTrend[momentumTrend.length - 1] < momentumTrend[momentumTrend.length - 2]
          ? 'dipping'
          : 'steady'
      : 'steady'

    const greeting = await generateGreeting(userName, momentumScore, trendWord, topInsight, burnoutRisk)

    const report: LifeReport = {
      greeting,
      momentumScore,
      momentumTrend,
      burnoutRisk,
      topInsight,
      highestImpactAction,
      domains,
      healthSummary,
      generatedAt: new Date().toISOString(),
    }

    await saveInsight(userId, 'life_report', JSON.stringify(report))
    return report
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface HealthEntryRow {
  sleep_hours?: number | null
  energy_level?: number | null
  mood?: string | null
  notes?: string | null
}

function buildHealthSummary(entry: HealthEntryRow | null): string | null {
  if (!entry) return null
  const parts: string[] = []
  if (entry.sleep_hours != null) parts.push(`${entry.sleep_hours}h sleep`)
  if (entry.energy_level != null) parts.push(`energy ${entry.energy_level}/10`)
  if (entry.mood) parts.push(`mood: ${entry.mood}`)
  return parts.length > 0 ? parts.join(' · ') : null
}

function computeBurnoutRisk(trend: number[]): 'low' | 'medium' | 'high' {
  if (trend.length < 3) return 'low'
  const last3 = trend.slice(-3)
  const declining = last3.every((v, i) => i === 0 || v <= last3[i - 1])
  if (declining && last3[0] - last3[2] > 10) return 'high'
  const avgChange = (last3[2] - last3[0]) / 2
  if (avgChange < -2) return 'medium'
  return 'low'
}

async function generateGreeting(
  name: string,
  score: number,
  trend: string,
  topInsight: string,
  burnoutRisk: string,
): Promise<string> {
  try {
    const prompt = `You are VitaMind, an AI life navigator. Write a warm, personal 2-sentence morning greeting for ${name}.

Context:
- Momentum score: ${score}/100 (${trend})
- Burnout risk: ${burnoutRisk}
- Top insight: ${topInsight}

Rules:
- Address them by first name
- Reference one specific data point
- Be encouraging but honest
- NO fluff, NO emojis, NO markdown
- Exactly 2 sentences`

    const text = await complete({ prompt, maxTokens: 100, temperature: 0.6 })
    return text.trim()
  } catch {
    return `Good morning, ${name}. Your momentum score is ${score} — let's make today count.`
  }
}
