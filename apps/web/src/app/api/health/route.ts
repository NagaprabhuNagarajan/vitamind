import { createAdminClient } from '@/lib/supabase/admin'

interface HealthResponse {
  status: 'ok' | 'degraded'
  timestamp: string
  version: string
  environment: string
  checks: {
    supabase: 'connected' | 'unreachable'
  }
}

/**
 * Public health check endpoint for monitoring tools.
 * No auth required, no rate limiting applied.
 */
export async function GET(): Promise<Response> {
  const timestamp = new Date().toISOString()
  const version = process.env.npm_package_version ?? '1.0.0'
  const environment = process.env.NODE_ENV ?? 'unknown'

  // Verify Supabase connectivity with a lightweight query
  let supabaseStatus: 'connected' | 'unreachable' = 'unreachable'
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('tasks').select('id', { count: 'exact', head: true })
    supabaseStatus = error ? 'unreachable' : 'connected'
  } catch {
    supabaseStatus = 'unreachable'
  }

  const overallStatus = supabaseStatus === 'connected' ? 'ok' : 'degraded'

  const body: HealthResponse = {
    status: overallStatus,
    timestamp,
    version,
    environment,
    checks: {
      supabase: supabaseStatus,
    },
  }

  return Response.json(body, {
    status: overallStatus === 'ok' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
