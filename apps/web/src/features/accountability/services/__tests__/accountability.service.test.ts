import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AccountabilityService } from '../accountability.service'
import { createMockQueryBuilder } from '@/test-utils/mock-supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: vi.fn(() => createMockQueryBuilder()),
  })),
}))

vi.mock('@/features/ai/services/ai-provider', () => ({
  complete: vi.fn(),
}))

const USER_ID = 'user-123'

function makeContract(overrides = {}) {
  return {
    id: 'c1',
    user_id: USER_ID,
    title: 'Exercise daily',
    type: 'habit',
    target_id: 'h1',
    commitment: 'Exercise every day',
    stakes: 'Donate $50 to charity',
    stake_amount_cents: 5000,
    check_in_frequency: 'daily',
    end_date: '2026-04-01',
    status: 'active',
    progress: 0,
    misses: 0,
    description: null,
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

function makeCheckin(overrides = {}) {
  return {
    id: 'ci1',
    contract_id: 'c1',
    user_id: USER_ID,
    date: '2026-03-05',
    met: true,
    auto_tracked: true,
    notes: null,
    created_at: '2026-03-05T00:00:00Z',
    ...overrides,
  }
}

describe('AccountabilityService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('getAll', () => {
    it('returns empty when no contracts exist', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const builder = createMockQueryBuilder()
      builder.then = vi.fn((resolve: any) => resolve({ data: [] }))
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => builder) } as any)

      const result = await AccountabilityService.getAll(USER_ID)
      expect(result).toEqual([])
    })

    it('computes streak from consecutive met check-ins', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const contract = makeContract()
      const checkins = [
        makeCheckin({ id: 'ci3', date: '2026-03-05', met: true }),
        makeCheckin({ id: 'ci2', date: '2026-03-04', met: true }),
        makeCheckin({ id: 'ci1', date: '2026-03-03', met: false }),
      ]

      let callCount = 0
      const mockFrom = vi.fn(() => {
        const builder = createMockQueryBuilder()
        callCount++
        if (callCount === 1) {
          // contracts
          builder.then = vi.fn((resolve: any) => resolve({ data: [contract] }))
        } else {
          // checkins
          builder.then = vi.fn((resolve: any) => resolve({ data: checkins }))
        }
        return builder
      })

      vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)

      const result = await AccountabilityService.getAll(USER_ID)
      expect(result.length).toBe(1)
      expect(result[0].streak).toBe(2) // ci3, ci2 are met, ci1 breaks the streak
    })

    it('streak is 0 when first check-in is not met', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const contract = makeContract()
      const checkins = [
        makeCheckin({ id: 'ci1', date: '2026-03-05', met: false }),
        makeCheckin({ id: 'ci2', date: '2026-03-04', met: true }),
      ]

      let callCount = 0
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => {
          const builder = createMockQueryBuilder()
          callCount++
          if (callCount === 1) {
            builder.then = vi.fn((resolve: any) => resolve({ data: [contract] }))
          } else {
            builder.then = vi.fn((resolve: any) => resolve({ data: checkins }))
          }
          return builder
        }),
      } as any)

      const result = await AccountabilityService.getAll(USER_ID)
      expect(result[0].streak).toBe(0)
    })
  })

  describe('create', () => {
    it('inserts a contract and returns it', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const contract = makeContract()
      const builder = createMockQueryBuilder()
      builder.then = vi.fn((resolve: any) => resolve({ data: contract, error: null }))
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => builder) } as any)

      const result = await AccountabilityService.create(USER_ID, {
        title: 'Exercise daily',
        type: 'habit',
        target_id: 'h1',
        commitment: 'Exercise every day',
        stakes: 'Donate $50',
        check_in_frequency: 'daily',
        end_date: '2026-04-01',
      })

      expect(result.title).toBe('Exercise daily')
    })

    it('throws when supabase returns error', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const builder = createMockQueryBuilder()
      builder.then = vi.fn((resolve: any) => resolve({ data: null, error: { message: 'duplicate' } }))
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => builder) } as any)

      await expect(AccountabilityService.create(USER_ID, {
        title: 'Test',
        type: 'custom',
        commitment: 'Do it',
        check_in_frequency: 'daily',
        end_date: '2026-04-01',
      })).rejects.toThrow('duplicate')
    })
  })

  describe('cancel', () => {
    it('updates contract status to cancelled', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const updateFn = vi.fn(() => {
        const builder = createMockQueryBuilder()
        return builder
      })
      const builder = createMockQueryBuilder()
      builder.update = updateFn
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => builder) } as any)

      await AccountabilityService.cancel(USER_ID, 'c1')
      // No error = success
    })
  })

  describe('getNudge', () => {
    it('returns AI-generated nudge', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { complete } = await import('@/features/ai/services/ai-provider')
      vi.mocked(complete).mockResolvedValue("You're doing great! Keep pushing.")

      let callCount = 0
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => {
          const builder = createMockQueryBuilder()
          callCount++
          if (callCount === 1) {
            // contract
            builder.then = vi.fn((resolve: any) => resolve({ data: makeContract() }))
          } else {
            // checkins
            builder.then = vi.fn((resolve: any) => resolve({
              data: [makeCheckin({ met: true }), makeCheckin({ id: 'ci2', met: false })],
            }))
          }
          return builder
        }),
      } as any)

      const result = await AccountabilityService.getNudge(USER_ID, 'c1')
      expect(result).toBe("You're doing great! Keep pushing.")
    })

    it('returns fallback when AI fails', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { complete } = await import('@/features/ai/services/ai-provider')
      vi.mocked(complete).mockRejectedValue(new Error('AI down'))

      let callCount = 0
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => {
          const builder = createMockQueryBuilder()
          callCount++
          if (callCount === 1) {
            builder.then = vi.fn((resolve: any) => resolve({ data: makeContract() }))
          } else {
            builder.then = vi.fn((resolve: any) => resolve({
              data: [makeCheckin({ met: true }), makeCheckin({ id: 'ci2', met: true })],
            }))
          }
          return builder
        }),
      } as any)

      const result = await AccountabilityService.getNudge(USER_ID, 'c1')
      expect(result).toContain('Exercise daily')
      expect(result).toContain('2')
    })

    it('throws when contract not found', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const builder = createMockQueryBuilder()
      builder.then = vi.fn((resolve: any) => resolve({ data: null }))
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => builder) } as any)

      await expect(AccountabilityService.getNudge(USER_ID, 'bad-id')).rejects.toThrow('Contract not found')
    })
  })
})
