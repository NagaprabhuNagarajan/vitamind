import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { validateString, validateEnum } from '@/lib/api/validation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Common timezone values — not exhaustive, but covers the most-used zones.
// Supabase stores any IANA string, so this list is for validation only.
const TIMEZONES = [
  'UTC',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto', 'America/Vancouver',
  'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'America/Mexico_City',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Europe/Istanbul', 'Europe/Amsterdam', 'Europe/Rome', 'Europe/Madrid',
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Shanghai', 'Asia/Tokyo',
  'Asia/Seoul', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Bangkok',
  'Asia/Jakarta', 'Asia/Karachi', 'Asia/Dhaka',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
  'Pacific/Auckland', 'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg',
] as const

// ─── GET /api/v1/user — fetch current user profile ──────────────────────────

export const GET = withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, timezone, created_at')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      // User row may not exist yet (e.g. OAuth signup without trigger)
      return successResponse({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        timezone: null,
        created_at: user.created_at,
      })
    }

    return successResponse(profile)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'user', tier: RateLimitTier.standard })

// ─── PUT /api/v1/user — update profile (name, timezone) ─────────────────────

export const PUT = withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const name = validateString(body.name, 'name', { minLength: 1, maxLength: 100 })
    const timezone = validateEnum(body.timezone, 'timezone', TIMEZONES)

    // Build update payload — only include fields that were provided
    const updates: Record<string, string> = {}
    if (name !== undefined) updates.name = name
    if (timezone !== undefined) updates.timezone = timezone

    if (Object.keys(updates).length === 0) {
      return successResponse({ message: 'No changes' })
    }

    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select('id, email, name, avatar_url, timezone, created_at')
      .single()

    if (error) {
      return errorResponse(error)
    }

    return successResponse(profile)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'user', tier: RateLimitTier.standard })

// ─── DELETE /api/v1/user — permanently delete account ────────────────────────

export const DELETE = withRateLimit(async () => {
  try {
    const user = await requireAuth()
    const adminClient = createAdminClient()

    // Delete the auth user — CASCADE in the DB schema will remove rows from
    // users, tasks, goals, habits, habit_logs, etc.
    const { error } = await adminClient.auth.admin.deleteUser(user.id)

    if (error) {
      console.error('[DELETE /api/v1/user] Failed to delete auth user:', error.message)
      return errorResponse(error)
    }

    return successResponse({ message: 'Account deleted successfully' })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'user-delete', tier: { maxRequests: 3, windowMs: 60_000 } })
