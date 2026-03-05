import { test, expect } from '@playwright/test'

/**
 * Health check endpoint E2E tests.
 *
 * The /api/health endpoint is public (no auth required) and returns
 * the service status, timestamp, version, environment, and Supabase
 * connectivity check.
 *
 * Note: In local dev without Supabase env vars, the health endpoint
 * may return a 503 with status "degraded" since Supabase will be
 * unreachable. Both 200 and 503 are valid responses depending on
 * environment configuration.
 */

test.describe('Health check endpoint', () => {
  test('GET /api/health returns a valid response', async ({ request }) => {
    const response = await request.get('/api/health')

    // Accept both 200 (ok) and 503 (degraded) as valid responses
    // depending on whether Supabase is configured
    expect([200, 503]).toContain(response.status())

    const body = await response.json()

    // Verify required fields exist in the response
    expect(body).toHaveProperty('status')
    expect(['ok', 'degraded']).toContain(body.status)

    expect(body).toHaveProperty('timestamp')
    expect(typeof body.timestamp).toBe('string')

    expect(body).toHaveProperty('version')
    expect(typeof body.version).toBe('string')

    expect(body).toHaveProperty('environment')
    expect(typeof body.environment).toBe('string')
  })

  test('response has Supabase connectivity check', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = await response.json()

    expect(body).toHaveProperty('checks')
    expect(body.checks).toHaveProperty('supabase')
    expect(['connected', 'unreachable']).toContain(body.checks.supabase)
  })

  test('response has no-store cache header', async ({ request }) => {
    const response = await request.get('/api/health')

    const cacheControl = response.headers()['cache-control']
    expect(cacheControl).toBe('no-store')
  })

  test('response timestamp is a valid ISO 8601 date', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = await response.json()

    const date = new Date(body.timestamp)
    expect(date.getTime()).not.toBeNaN()

    // Timestamp should be recent (within the last 60 seconds)
    const now = Date.now()
    const diff = now - date.getTime()
    expect(diff).toBeLessThan(60_000)
  })
})
