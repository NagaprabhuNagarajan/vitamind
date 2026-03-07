import { createClient } from '@/lib/supabase/server'
import { complete } from '@/features/ai/services/ai-provider'
import { MomentumService } from '@/features/momentum/services/momentum.service'
import { HealthService } from '@/features/health/services/health.service'
import { FinanceService } from '@/features/finance/services/finance.service'

export interface SimulationMilestone {
  month: number   // 1, 3, 6, or 12
  title: string
  description: string
  probability: number  // 0–100
  metric?: string      // e.g. "₹12,000 saved", "8kg lost"
}

export interface SimulationResult {
  scenario: string
  summary: string
  outcome_at_12_months: string
  probability_of_success: number   // 0–100
  milestones: SimulationMilestone[]
  key_risks: string[]
  key_enablers: string[]           // what would make this more likely to succeed
  recommendation: string
}

export class LifeSimulationService {
  static async simulate(userId: string, scenario: string): Promise<SimulationResult> {
    const supabase = await createClient()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Gather current state in parallel
    const [
      { data: goals },
      { data: habits },
      { data: tasks },
      momentumResult,
      healthResult,
      financeResult,
    ] = await Promise.all([
      supabase.from('goals').select('title, progress, domain, target_date').eq('user_id', userId).eq('is_active', true).limit(5),
      supabase.from('habits').select('title, frequency').eq('user_id', userId).eq('is_active', true),
      supabase.from('tasks').select('status').eq('user_id', userId).gte('created_at', thirtyDaysAgo.toISOString()),
      MomentumService.getCurrentScore(userId).catch(() => null),
      HealthService.getInsights(userId, 30).catch(() => null),
      FinanceService.getMonthlySummary(userId, new Date().toISOString().substring(0, 7)).catch(() => null),
    ])

    const allTasks = tasks ?? []
    const completionRate = allTasks.length > 0
      ? Math.round((allTasks.filter((t) => t.status === 'completed').length / allTasks.length) * 100)
      : 0

    const goalsList = (goals ?? []).map((g) => `${g.title} (${g.progress ?? 0}% complete)`).join('; ')
    const habitsList = (habits ?? []).map((h) => h.title).join(', ')
    const mom = momentumResult
    const health = healthResult
    const finance = financeResult

    const prompt = `You are VitaMind's Life Simulation Engine. Simulate what this user's life could look like if they follow through on the given scenario.

SCENARIO: "${scenario}"

CURRENT BASELINE:
- Task completion rate (30d): ${completionRate}%
${mom ? `- Momentum: ${mom.score}/100 | Burnout risk: ${mom.burnout_risk}/100` : ''}
${goalsList ? `- Active goals: ${goalsList}` : ''}
${habitsList ? `- Active habits: ${habitsList}` : ''}
${health ? `- Avg sleep: ${health.avg_sleep ?? 'N/A'}h | Avg mood: ${health.avg_mood ?? 'N/A'}/5` : ''}
${finance ? `- Monthly income: ${finance.total_income} | Expenses: ${finance.total_expense} | Net: ${finance.net}` : ''}

Generate a realistic, specific simulation of outcomes over 12 months if this scenario is pursued. Be data-driven and honest about probabilities.

Respond in JSON only (no markdown):
{
  "scenario": "exact scenario text",
  "summary": "2-3 sentence overview of projected trajectory",
  "outcome_at_12_months": "specific, measurable outcome description at 12 months",
  "probability_of_success": 72,
  "milestones": [
    {"month": 1, "title": "...", "description": "...", "probability": 90, "metric": "optional measurable value"},
    {"month": 3, "title": "...", "description": "...", "probability": 80, "metric": "..."},
    {"month": 6, "title": "...", "description": "...", "probability": 70, "metric": "..."},
    {"month": 12, "title": "...", "description": "...", "probability": 60, "metric": "..."}
  ],
  "key_risks": ["risk 1", "risk 2", "risk 3"],
  "key_enablers": ["enabler 1", "enabler 2", "enabler 3"],
  "recommendation": "One actionable sentence on the single most important first step"
}`

    const raw = await complete({ prompt, maxTokens: 900, temperature: 0.5 })
    const parsed = JSON.parse(raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()) as SimulationResult

    return {
      scenario: parsed.scenario ?? scenario,
      summary: parsed.summary ?? '',
      outcome_at_12_months: parsed.outcome_at_12_months ?? '',
      probability_of_success: parsed.probability_of_success ?? 50,
      milestones: (parsed.milestones ?? []).slice(0, 4) as SimulationMilestone[],
      key_risks: parsed.key_risks ?? [],
      key_enablers: parsed.key_enablers ?? [],
      recommendation: parsed.recommendation ?? '',
    }
  }
}
