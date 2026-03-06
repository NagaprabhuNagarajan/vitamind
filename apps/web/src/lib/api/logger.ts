// Structured request logging middleware for API route handlers.
// Outputs JSON lines to stdout where Vercel automatically captures them.
// Designed to compose as the outermost wrapper around withCors / withRateLimit.

type NextRouteHandler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  timestamp: string
  method: string
  path: string
  status: number
  duration_ms: number
  user_id: string | null
}

interface ErrorLogEntry extends LogEntry {
  error: string
  stack?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractPath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    // Fallback if URL parsing fails (e.g. relative URLs in tests)
    return url
  }
}

/**
 * Attempts to extract the user ID from the response without consuming the body.
 * The auth-guard sets a custom header we can read cheaply.  As a fallback,
 * we return null — the rate-limit wrapper already logs the user internally.
 */
function extractUserId(request: Request): string | null {
  // The auth-guard does not set a header currently, so we rely on the
  // Authorization header presence as a signal (actual ID requires DB lookup
  // which we avoid in the logging layer for performance).
  return request.headers.get('x-user-id') ?? null
}

// ─── Wrapper ─────────────────────────────────────────────────────────────────

/**
 * Wraps a Next.js route handler with structured JSON logging.
 * Should be the outermost wrapper so it captures the full request lifecycle
 * including CORS and rate-limit overhead.
 *
 * Usage:
 * ```ts
 * export const GET = withLogging(
 *   withCors(
 *     withRateLimit(async (request) => { ... }, { ... })
 *   )
 * )
 * ```
 */
export function withLogging(handler: NextRouteHandler): NextRouteHandler {
  return async (request, context) => {
    const start = performance.now()
    const method = request.method
    const path = extractPath(request.url)

    try {
      const response = await handler(request, context)
      const duration_ms = Math.round(performance.now() - start)

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        method,
        path,
        status: response.status,
        duration_ms,
        user_id: extractUserId(request),
      }

      console.log(JSON.stringify(entry))

      return response
    } catch (error) {
      const duration_ms = Math.round(performance.now() - start)

      const entry: ErrorLogEntry = {
        timestamp: new Date().toISOString(),
        method,
        path,
        status: 500,
        duration_ms,
        user_id: extractUserId(request),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }

      console.error(JSON.stringify(entry))

      // Re-throw so the caller's error handling still applies
      throw error
    }
  }
}
