import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock state shared across tests ────────────────────────────────────────────
let getCacheData: unknown = null
let trimData: unknown[] | null = null
let insertCalls: unknown[][] = []
let deleteCalls: unknown[][] = []

// ── Mock Supabase admin client with fluent chain support ──────────────────────
vi.mock('@/lib/supabase/admin', () => {
  return {
    createAdminClient: () => {
      const makeSelectChain = () => {
        const chain: Record<string, (...args: unknown[]) => unknown> = {}
        chain.eq = () => chain
        chain.gte = () => chain
        chain.order = () => chain
        chain.limit = () => chain
        chain.single = () => ({ data: getCacheData })
        return chain
      }

      const makeTrimChain = () => {
        const chain: Record<string, (...args: unknown[]) => unknown> = {}
        chain.eq = () => chain
        chain.order = () => chain
        chain.range = () => ({ data: trimData })
        return chain
      }

      return {
        from: () => ({
          select: (cols: string) => {
            if (cols === 'id') return makeTrimChain()
            return makeSelectChain()
          },
          insert: (...args: unknown[]) => {
            insertCalls.push(args)
            return { data: null, error: null }
          },
          delete: () => {
            const delChain: Record<string, (...a: unknown[]) => unknown> = {}
            delChain.eq = () => delChain
            delChain.in = (...args: unknown[]) => {
              deleteCalls.push(args)
              return { data: null, error: null }
            }
            return delChain
          },
        }),
      }
    },
  }
})

import { getCachedInsight, saveInsight } from '../cache'

describe('getCachedInsight', () => {
  beforeEach(() => {
    getCacheData = null
    trimData = null
    insertCalls = []
    deleteCalls = []
  })

  it('returns cached content when data exists', async () => {
    getCacheData = { content: 'Your plan for today...', created_at: '2026-03-05T08:00:00Z' }

    const result = await getCachedInsight('user-1', 'daily_plan')
    expect(result).toBe('Your plan for today...')
  })

  it('returns null on cache miss (no data)', async () => {
    getCacheData = null

    const result = await getCachedInsight('user-1', 'daily_plan')
    expect(result).toBeNull()
  })

  it('returns null when content field is null', async () => {
    getCacheData = { content: null }

    const result = await getCachedInsight('user-1', 'productivity')
    expect(result).toBeNull()
  })
})

describe('saveInsight', () => {
  beforeEach(() => {
    getCacheData = null
    trimData = null
    insertCalls = []
    deleteCalls = []
  })

  it('inserts a new insight with default empty metadata', async () => {
    trimData = []

    await saveInsight('user-1', 'daily_plan', 'Your plan...')

    expect(insertCalls).toHaveLength(1)
    expect(insertCalls[0][0]).toEqual({
      user_id: 'user-1',
      type: 'daily_plan',
      content: 'Your plan...',
      metadata: {},
    })
  })

  it('passes custom metadata when provided', async () => {
    trimData = []

    await saveInsight('user-1', 'productivity', 'Great week!', { score: 85 })

    expect(insertCalls[0][0]).toEqual({
      user_id: 'user-1',
      type: 'productivity',
      content: 'Great week!',
      metadata: { score: 85 },
    })
  })

  it('trims old entries when more than 30 exist', async () => {
    trimData = [{ id: 'old-1' }, { id: 'old-2' }]

    await saveInsight('user-1', 'daily_plan', 'New plan')

    expect(deleteCalls).toHaveLength(1)
    expect(deleteCalls[0]).toEqual(['id', ['old-1', 'old-2']])
  })

  it('does not delete when no old entries to trim', async () => {
    trimData = []

    await saveInsight('user-1', 'daily_plan', 'New plan')

    expect(deleteCalls).toHaveLength(0)
  })

  it('does not delete when trim query returns null', async () => {
    trimData = null

    await saveInsight('user-1', 'daily_plan', 'New plan')

    expect(deleteCalls).toHaveLength(0)
  })
})
