// In-memory sliding window rate limiter — keyed per user, no external dependencies.
// Suitable for Vercel serverless: each cold-start gets a fresh Map, so limits
// are per-instance rather than global.  This is intentional — it prevents abuse
// from a single connection while keeping the implementation zero-cost.  For
// stricter global enforcement, swap the store for Upstash Redis later.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Maximum requests allowed within the window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
}

interface TokenBucket {
  /** Timestamps of requests within the current window */
  timestamps: number[]
}

// ─── Preset tiers ─────────────────────────────────────────────────────────────

export const RateLimitTier = {
  /** Standard CRUD operations — generous limit */
  standard: { maxRequests: 100, windowMs: 60_000 } satisfies RateLimitConfig,
  /** Dashboard aggregation — moderate limit */
  dashboard: { maxRequests: 30, windowMs: 60_000 } satisfies RateLimitConfig,
  /** AI endpoints — expensive, tightly capped */
  ai: { maxRequests: 10, windowMs: 60_000 } satisfies RateLimitConfig,
} as const

// ─── Store ────────────────────────────────────────────────────────────────────

// Single shared Map across all limiters in this process.  Each entry is keyed
// by "{userId}:{routeKey}" so different tiers track independently.
const store = new Map<string, TokenBucket>()

// Cleanup stale entries every 5 minutes to prevent unbounded memory growth
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

let cleanupTimer: ReturnType<typeof setInterval> | null = null

// Maximum window across all tiers — used during cleanup to decide which
// timestamps are definitively stale regardless of tier
const MAX_WINDOW_MS = 120_000

function ensureCleanupScheduled() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of store) {
      // Drop timestamps older than the longest possible window
      bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < MAX_WINDOW_MS)
      if (bucket.timestamps.length === 0) {
        store.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)

  // Allow the Node process to exit even if the timer is still scheduled
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

// ─── Core check ───────────────────────────────────────────────────────────────

/**
 * Checks whether a user has exceeded the rate limit for a given route key.
 * Returns the number of seconds until the window resets if limited, or null if allowed.
 */
function checkRateLimit(
  userId: string,
  routeKey: string,
  config: RateLimitConfig,
): { limited: true; retryAfterSeconds: number } | { limited: false } {
  const key = `${userId}:${routeKey}`
  const now = Date.now()
  const windowStart = now - config.windowMs

  let bucket = store.get(key)
  if (!bucket) {
    bucket = { timestamps: [] }
    store.set(key, bucket)
  }

  // Slide the window — drop expired timestamps
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart)

  if (bucket.timestamps.length >= config.maxRequests) {
    // Oldest surviving timestamp determines when the window fully rotates
    const oldestInWindow = bucket.timestamps[0]
    const retryAfterMs = oldestInWindow + config.windowMs - now
    return { limited: true, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) }
  }

  // Record this request
  bucket.timestamps.push(now)
  return { limited: false }
}

// ─── Public API: higher-order wrapper for Next.js route handlers ──────────────

type NextRouteHandler = (
  request: Request,
  context?: { params: Promise<Record<string, string>> },
) => Promise<Response>

/**
 * Wraps a Next.js route handler with per-user rate limiting.
 *
 * Usage:
 * ```ts
 * export const GET = withRateLimit(async (request) => { ... }, {
 *   routeKey: 'tasks',
 *   tier: RateLimitTier.standard,
 * })
 * ```
 *
 * The wrapper calls `requireAuth()` internally so the handler receives the user
 * as the third argument — but to keep the Next.js handler signature intact, the
 * user is injected via a custom header that the handler can read.  In practice,
 * most handlers already call `requireAuth()` themselves, so the wrapper only
 * needs the userId for the rate-limit key and lets the handler re-derive it.
 */
export function withRateLimit(
  handler: NextRouteHandler,
  options: {
    /** Unique key identifying the route group (e.g. "tasks", "ai-chat") */
    routeKey: string
    /** Rate limit configuration — use a RateLimitTier preset */
    tier: RateLimitConfig
  },
): NextRouteHandler {
  ensureCleanupScheduled()

  return async (request, context) => {
    // We need the userId *before* the handler runs.  Import requireAuth lazily
    // to avoid circular dependency issues at module evaluation time.
    const { requireAuth } = await import('./auth-guard')

    let userId: string
    try {
      const user = await requireAuth()
      userId = user.id
    } catch {
      // Auth failed — let it fall through to the handler so the existing
      // errorResponse(401) path is preserved.
      return handler(request, context)
    }

    const result = checkRateLimit(userId, options.routeKey, options.tier)

    if (result.limited) {
      return Response.json(
        {
          data: null,
          error: {
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMITED',
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfterSeconds),
          },
        },
      )
    }

    return handler(request, context)
  }
}
