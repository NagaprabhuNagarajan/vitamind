import { createClient } from '@/lib/supabase/server'
import { getCachedInsight, saveInsight } from '@/features/ai/services/cache'
import type { Goal, LifeDomain } from '@/lib/types'

const ALL_DOMAINS: LifeDomain[] = [
  'health', 'career', 'relationships', 'finance', 'learning', 'personal',
]

export interface DomainVelocity {
  domain: LifeDomain
  score: number       // current score 0–100 (recent 14-day window)
  delta: number       // change in points vs prior 14-day window
  trend: 'up' | 'down' | 'stable'
}

export interface HighestImpactAction {
  action: string
  domain: LifeDomain
  projectedImpact: string
}

export interface TrajectoryReport {
  domains: DomainVelocity[]
  overallTrend: 'up' | 'down' | 'stable'
  highestImpactAction: HighestImpactAction
  generatedAt: string
}

// ─── Action Templates ────────────────────────────────────────────────────────

const ACTION_TEMPLATES: Record<LifeDomain, { action: string; impact: string }> = {
  health: {
    action: '30-minute workout or walk',
    impact: '+5% health score, +2% momentum',
  },
  career: {
    action: 'Complete one high-priority work task',
    impact: '+4% career score, +3% productivity',
  },
  relationships: {
    action: 'Reach out to one person you care about',
    impact: '+5% relationships score, +1% momentum',
  },
  finance: {
    action: 'Review and log today\'s expenses',
    impact: '+4% finance score, +2% awareness',
  },
  learning: {
    action: 'Spend 30 minutes on a course or book',
    impact: '+5% learning score, +2% momentum',
  },
  personal: {
    action: '15-minute journaling or reflection',
    impact: '+4% personal score, +2% clarity',
  },
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateTrajectoryReport(
  userId: string,
  force = false,
): Promise<TrajectoryReport> {
  if (!force) {
    const cached = await getCachedInsight(userId, 'trajectory')
    if (cached) {
      return JSON.parse(cached) as TrajectoryReport
    }
  }

  const supabase = await createClient()

  // Date window boundaries
  const now = new Date()
  const recentEnd = now.toISOString().split('T')[0]
  const recentStart = offsetDate(now, -14)
  const priorEnd = offsetDate(now, -15)
  const priorStart = offsetDate(now, -28)

  // Fetch all data in parallel
  const [goals, recentTaskStats, priorTaskStats, recentHabitRate, priorHabitRate] =
    await Promise.all([
      fetchGoalsByDomain(supabase, userId),
      fetchTaskStatsByDomain(supabase, userId, recentStart, recentEnd),
      fetchTaskStatsByDomain(supabase, userId, priorStart, priorEnd),
      fetchHabitRateInWindow(supabase, userId, recentStart, recentEnd),
      fetchHabitRateInWindow(supabase, userId, priorStart, priorEnd),
    ])

  // Compute per-domain scores for both windows
  const recentScores = computeDomainScores(goals, recentTaskStats, recentHabitRate)
  const priorScores = computeDomainScores(goals, priorTaskStats, priorHabitRate)

  const domains: DomainVelocity[] = ALL_DOMAINS.map((domain) => {
    const recent = recentScores.get(domain) ?? 0
    const prior = priorScores.get(domain) ?? 0
    const delta = Math.round(recent - prior)
    const trend: DomainVelocity['trend'] = delta > 3 ? 'up' : delta < -3 ? 'down' : 'stable'
    return { domain, score: recent, delta, trend }
  })

  // Overall trend: weighted average of deltas
  const avgDelta = Math.round(domains.reduce((sum, d) => sum + d.delta, 0) / domains.length)
  const overallTrend: DomainVelocity['trend'] = avgDelta > 2 ? 'up' : avgDelta < -2 ? 'down' : 'stable'

  // Highest Impact Action: domain with worst trajectory (lowest score + declining/stable)
  const highestImpactAction = computeHighestImpactAction(domains)

  const report: TrajectoryReport = {
    domains,
    overallTrend,
    highestImpactAction,
    generatedAt: new Date().toISOString(),
  }

  await saveInsight(userId, 'trajectory', JSON.stringify(report))
  return report
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function offsetDate(base: Date, days: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function fetchGoalsByDomain(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<LifeDomain, Goal[]>> {
  const { data } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_completed', false)

  const map = new Map<LifeDomain, Goal[]>()
  for (const domain of ALL_DOMAINS) map.set(domain, [])
  for (const goal of (data ?? []) as Goal[]) {
    map.get(goal.domain)?.push(goal)
  }
  return map
}

interface TaskStats { total: number; completed: number }

async function fetchTaskStatsByDomain(
  supabase: SupabaseClient,
  userId: string,
  since: string,
  until: string,
): Promise<Map<LifeDomain, TaskStats>> {
  const { data } = await supabase
    .from('tasks')
    .select('status, goals!inner(domain)')
    .eq('user_id', userId)
    .gte('created_at', since)
    .lte('created_at', until + 'T23:59:59')

  const map = new Map<LifeDomain, TaskStats>()
  for (const domain of ALL_DOMAINS) map.set(domain, { total: 0, completed: 0 })

  for (const task of data ?? []) {
    const goalRef = task.goals as unknown as { domain: LifeDomain }
    const domain = goalRef?.domain
    const stats = domain ? map.get(domain) : undefined
    if (!stats) continue
    stats.total += 1
    if (task.status === 'completed') stats.completed += 1
  }

  return map
}

async function fetchHabitRateInWindow(
  supabase: SupabaseClient,
  userId: string,
  since: string,
  until: string,
): Promise<number> {
  const { data } = await supabase
    .from('habit_logs')
    .select('status')
    .eq('user_id', userId)
    .gte('date', since)
    .lte('date', until)

  const logs = data ?? []
  if (logs.length === 0) return 0
  const completed = logs.filter((l) => l.status === 'completed').length
  return Math.round((completed / logs.length) * 100)
}

function computeDomainScores(
  goals: Map<LifeDomain, Goal[]>,
  taskStats: Map<LifeDomain, TaskStats>,
  habitRate: number,
): Map<LifeDomain, number> {
  const scores = new Map<LifeDomain, number>()

  for (const domain of ALL_DOMAINS) {
    const domainGoals = goals.get(domain) ?? []
    const stats = taskStats.get(domain) ?? { total: 0, completed: 0 }

    const goalProgress = domainGoals.length > 0
      ? Math.round(domainGoals.reduce((sum, g) => sum + g.progress, 0) / domainGoals.length)
      : 0

    const taskRate = stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0

    // Same weighting as Life Map: goals 50%, tasks 30%, habits 20%
    scores.set(domain, Math.round(goalProgress * 0.5 + taskRate * 0.3 + habitRate * 0.2))
  }

  return scores
}

function computeHighestImpactAction(domains: DomainVelocity[]): HighestImpactAction {
  // Priority: declining domains first, then by lowest score
  const sorted = [...domains].sort((a, b) => {
    if (a.trend === 'down' && b.trend !== 'down') return -1
    if (b.trend === 'down' && a.trend !== 'down') return 1
    return a.score - b.score
  })

  const target = sorted[0]
  const template = ACTION_TEMPLATES[target.domain]

  return {
    action: template.action,
    domain: target.domain,
    projectedImpact: template.impact,
  }
}
