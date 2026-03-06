import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { createClient } from '@/lib/supabase/server'
import type { Goal, LifeDomain } from '@/lib/types'

export { OPTIONS }

const ALL_DOMAINS: LifeDomain[] = [
  'health', 'career', 'relationships', 'finance', 'learning', 'personal',
]

interface DomainData {
  score: number
  goalCount: number
  activeGoals: Goal[]
  topInsight: string | null
}

type DomainsMap = Record<LifeDomain, DomainData>

// ─── GET /api/v1/life-map ────────────────────────────────────────────────────
// Returns a per-domain score breakdown powering the radar/hexagonal Life Map view.
// Scores blend goal progress (50%), task completion (30%), and habit consistency (20%).
export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Run all three data fetches in parallel to avoid sequential waterfalls
    const [goalsResult, tasksResult, habitRate] = await Promise.all([
      fetchGoalsByDomain(supabase, user.id),
      fetchTaskStatsByDomain(supabase, user.id),
      fetchOverallHabitRate(supabase, user.id),
    ])

    const domains = buildDomainScores(goalsResult, tasksResult, habitRate)
    const overallScore = computeOverallScore(domains)

    return successResponse({
      domains,
      overallScore,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'life-map', tier: RateLimitTier.dashboard })))

// ─── Data Fetching ───────────────────────────────────────────────────────────

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function fetchGoalsByDomain(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<LifeDomain, Goal[]>> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_completed', false)

  if (error) throw error

  const map = new Map<LifeDomain, Goal[]>()
  for (const domain of ALL_DOMAINS) {
    map.set(domain, [])
  }

  for (const goal of (data ?? []) as Goal[]) {
    const existing = map.get(goal.domain)
    if (existing) {
      existing.push(goal)
    }
  }

  return map
}

interface TaskStats {
  total: number
  completed: number
}

async function fetchTaskStatsByDomain(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<LifeDomain, TaskStats>> {
  // Join tasks to goals to group task counts by the goal's domain.
  // We only care about tasks that belong to a goal (goal_id IS NOT NULL).
  const { data, error } = await supabase
    .from('tasks')
    .select('status, goals!inner(domain)')
    .eq('user_id', userId)

  if (error) throw error

  const map = new Map<LifeDomain, TaskStats>()
  for (const domain of ALL_DOMAINS) {
    map.set(domain, { total: 0, completed: 0 })
  }

  for (const task of data ?? []) {
    // Supabase returns the joined goal as an object (or array depending on config)
    const goalRef = task.goals as unknown as { domain: LifeDomain }
    const domain = goalRef?.domain
    const stats = domain ? map.get(domain) : undefined
    if (!stats) continue

    stats.total += 1
    if (task.status === 'completed') {
      stats.completed += 1
    }
  }

  return map
}

async function fetchOverallHabitRate(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  // Use the last 30 days of habit logs as the consistency window.
  // Rate = completed logs / total logs (completed + skipped + missed).
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('habit_logs')
    .select('status')
    .eq('user_id', userId)
    .gte('date', since)

  if (error) throw error

  const logs = data ?? []
  if (logs.length === 0) return 0

  const completed = logs.filter((l) => l.status === 'completed').length
  return Math.round((completed / logs.length) * 100)
}

// ─── Score Computation ───────────────────────────────────────────────────────

function buildDomainScores(
  goalsByDomain: Map<LifeDomain, Goal[]>,
  taskStatsByDomain: Map<LifeDomain, TaskStats>,
  habitRate: number,
): DomainsMap {
  const result = {} as DomainsMap

  for (const domain of ALL_DOMAINS) {
    const goals = goalsByDomain.get(domain) ?? []
    const taskStats = taskStatsByDomain.get(domain) ?? { total: 0, completed: 0 }

    // Goal progress: average progress of active goals (0 if none)
    const goalProgress = goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
      : 0

    // Task completion rate: completed / total (0 if no tasks)
    const taskRate = taskStats.total > 0
      ? Math.round((taskStats.completed / taskStats.total) * 100)
      : 0

    // Weighted composite: goals 50%, tasks 30%, habits 20%
    const score = Math.round(
      goalProgress * 0.5 + taskRate * 0.3 + habitRate * 0.2,
    )

    const topInsight = generateInsight(domain, score, goals, goalProgress)

    result[domain] = {
      score,
      goalCount: goals.length,
      activeGoals: goals,
      topInsight,
    }
  }

  return result
}

function computeOverallScore(domains: DomainsMap): number {
  const scores = ALL_DOMAINS.map((d) => domains[d].score)
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

// ─── Template-based Insights ─────────────────────────────────────────────────

function formatDomainLabel(domain: LifeDomain): string {
  return domain.charAt(0).toUpperCase() + domain.slice(1)
}

function generateInsight(
  domain: LifeDomain,
  score: number,
  goals: Goal[],
  avgProgress: number,
): string {
  const label = formatDomainLabel(domain)

  if (goals.length === 0) {
    return score < 50
      ? `Consider setting goals for ${label}`
      : `No goals set for this domain yet`
  }

  if (score >= 80) {
    return `Excellent progress in ${label}!`
  }

  if (score >= 50) {
    return `${label} is on track — ${goals.length} active goal${goals.length === 1 ? '' : 's'} at ${avgProgress}% progress`
  }

  return `${label} needs attention — ${goals.length} goal${goals.length === 1 ? '' : 's'} averaging ${avgProgress}%`
}
