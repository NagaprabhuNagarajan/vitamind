import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { createClient } from '@/lib/supabase/server'

// ─── GET /api/v1/user/export — GDPR data export ────────────────────────────
// Returns all user data in a single JSON payload.  Rate-limited to the
// dashboard tier (30/min) to prevent abuse while still being accessible.

export const GET = withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Fetch all user data in parallel for maximum throughput.
    // Each query is individually wrapped so a single table failure
    // does not block the entire export.
    const [
      profileResult,
      tasksResult,
      goalsResult,
      habitsResult,
      habitLogsResult,
      aiInsightsResult,
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id, email, name, avatar_url, timezone, created_at')
        .eq('id', user.id)
        .single(),
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false }),
      supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    // Build the profile fallback from auth metadata when the users row
    // does not exist (e.g. OAuth signup without a DB trigger)
    const profile = profileResult.data ?? {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      timezone: null,
      created_at: user.created_at,
    }

    return successResponse({
      exported_at: new Date().toISOString(),
      user: profile,
      tasks: tasksResult.data ?? [],
      goals: goalsResult.data ?? [],
      habits: habitsResult.data ?? [],
      habit_logs: habitLogsResult.data ?? [],
      ai_insights: aiInsightsResult.data ?? [],
    })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'user-export', tier: RateLimitTier.dashboard })
