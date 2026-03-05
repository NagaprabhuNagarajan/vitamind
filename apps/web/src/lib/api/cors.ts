// CORS middleware for API route handlers.
// Reads allowed origins from ALLOWED_ORIGINS env var (comma-separated) and
// NEXT_PUBLIC_APP_URL.  In development, defaults to allowing all origins so
// local Flutter and web clients work without extra configuration.

type NextRouteHandler = (
  request: Request,
  context?: { params: Promise<Record<string, string>> },
) => Promise<Response>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>()

  const envOrigins = process.env.ALLOWED_ORIGINS
  if (envOrigins) {
    envOrigins.split(',').forEach((o) => {
      const trimmed = o.trim()
      if (trimmed) origins.add(trimmed)
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) origins.add(appUrl.replace(/\/$/, ''))

  return origins
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  if (isDevelopment()) return true

  const allowed = getAllowedOrigins()
  // If no origins are configured at all, deny by default in production
  if (allowed.size === 0) return false

  return allowed.has(origin)
}

function setCorsHeaders(headers: Headers, origin: string | null): void {
  const resolvedOrigin = origin && isOriginAllowed(origin) ? origin : ''

  if (resolvedOrigin) {
    headers.set('Access-Control-Allow-Origin', resolvedOrigin)
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Access-Control-Max-Age', '86400')
}

// ─── Preflight handler ───────────────────────────────────────────────────────

/** Export this as the OPTIONS handler in every route file */
export async function OPTIONS(request: Request): Promise<Response> {
  const origin = request.headers.get('origin')
  const response = new Response(null, { status: 204 })
  setCorsHeaders(response.headers, origin)
  return response
}

// ─── Wrapper ─────────────────────────────────────────────────────────────────

/**
 * Wraps a Next.js route handler to append CORS headers to every response.
 *
 * Usage:
 * ```ts
 * export const GET = withCors(async (request) => { ... })
 * ```
 */
export function withCors(handler: NextRouteHandler): NextRouteHandler {
  return async (request, context) => {
    const origin = request.headers.get('origin')
    const response = await handler(request, context)

    // Clone the response so we can modify headers (Response from
    // Response.json() is immutable in some runtimes)
    const mutableResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    })

    setCorsHeaders(mutableResponse.headers, origin)
    return mutableResponse
  }
}
