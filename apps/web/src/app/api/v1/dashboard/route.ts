import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { TaskService } from '@/features/tasks/services/task.service'
import { GoalService } from '@/features/goals/services/goal.service'
import { HabitService } from '@/features/habits/services/habit.service'
import { createClient } from '@/lib/supabase/server'

export { OPTIONS }

// Single endpoint that assembles all data the Dashboard needs — one round trip
export const GET = withLogging(withCors(withRateLimit(async () => {
  try {
    const user = await requireAuth()

    // Run all queries in parallel — no sequential waterfalls
    const [taskData, goalsResult, habitsResult, latestInsight] = await Promise.all([
      TaskService.getTodayAndOverdue(user.id),
      GoalService.getAll(user.id),
      HabitService.getAllWithStreaks(user.id),
      getLatestInsight(user.id),
    ])

    return successResponse({
      tasks_today: taskData.today,
      tasks_overdue: taskData.overdue,
      goals: goalsResult.data,
      habits_today: habitsResult.data,
      latest_insight: latestInsight,
    })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'dashboard', tier: RateLimitTier.dashboard })))

async function getLatestInsight(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data ?? null
}
