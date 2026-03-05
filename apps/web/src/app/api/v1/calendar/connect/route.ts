import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { Errors } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { validateString, validateEnum } from '@/lib/api/validation'
import { exchangeCodeForTokens } from '@/features/calendar/services/google-calendar'
import { createClient } from '@/lib/supabase/server'

export { OPTIONS }

const PROVIDERS = ['google'] as const

/**
 * POST /api/v1/calendar/connect
 * Exchanges an OAuth authorization code for tokens and stores the calendar connection.
 * Body: { provider: 'google', code: string, redirect_uri: string }
 */
export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const provider = validateEnum(body.provider, 'provider', PROVIDERS, { required: true })!
    const code = validateString(body.code, 'code', { required: true, minLength: 1 })!
    const redirectUri = validateString(body.redirect_uri, 'redirect_uri', { required: true, minLength: 1 })!

    // Exchange the authorization code for access + refresh tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri)

    if (!tokens.access_token) {
      throw Errors.badRequest('Failed to obtain access token from Google')
    }

    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Upsert the connection — if the user reconnects, update existing row
    const supabase = await createClient()
    const { error: dbError } = await supabase
      .from('calendar_connections')
      .upsert(
        {
          user_id: user.id,
          provider,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt,
          calendar_id: 'primary',
          sync_enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' },
      )

    if (dbError) {
      console.error('[Calendar Connect] DB error:', dbError)
      throw Errors.internal('Failed to store calendar connection')
    }

    return successResponse({ connected: true, provider }, 201)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'calendar-connect', tier: RateLimitTier.dashboard })))
