import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CascadeService } from '../cascade.service'
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

describe('CascadeService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('detectCascades', () => {
    it('returns empty array when no habit-goal links exist', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const builder = createMockQueryBuilder()
      builder.then = vi.fn((resolve: any) => resolve({ data: [] }))
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => builder) } as any)

      const result = await CascadeService.detectCascades(USER_ID)
      expect(result).toEqual([])
    })

    it('returns empty when links exist but data is null', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const builder = createMockQueryBuilder()
      builder.then = vi.fn((resolve: any) => resolve({ data: null }))
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => builder) } as any)

      const result = await CascadeService.detectCascades(USER_ID)
      expect(result).toEqual([])
    })

    it('only flags habits missing 3+ of 7 days', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { complete } = await import('@/features/ai/services/ai-provider')
      vi.mocked(complete).mockResolvedValue('{"suggestions":["catch up"]}')

      let callCount = 0
      const mockFrom = vi.fn(() => {
        const builder = createMockQueryBuilder()
        callCount++

        if (callCount === 1) {
          // habit_goal_links
          builder.then = vi.fn((resolve: any) => resolve({
            data: [{ habit_id: 'h1', goal_id: 'g1', impact_weight: 0.5 }],
          }))
        } else if (callCount === 2) {
          // habits
          builder.then = vi.fn((resolve: any) => resolve({
            data: [{ id: 'h1', title: 'Read 30 min' }],
          }))
        } else if (callCount === 3) {
          // goals
          builder.then = vi.fn((resolve: any) => resolve({
            data: [{ id: 'g1', title: 'Read 12 books' }],
          }))
        } else if (callCount === 4) {
          // habit_logs: 3 completed = 4 missed (7-3=4 >= 3, should flag)
          builder.then = vi.fn((resolve: any) => resolve({
            data: [
              { status: 'completed', date: '2026-03-01' },
              { status: 'completed', date: '2026-03-02' },
              { status: 'completed', date: '2026-03-03' },
            ],
          }))
        } else {
          // cascade_events insert
          builder.then = vi.fn((resolve: any) => resolve({ data: null }))
        }
        return builder
      })

      vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)

      const result = await CascadeService.detectCascades(USER_ID)
      expect(result.length).toBe(1)
      expect(result[0].habit_title).toBe('Read 30 min')
      expect(result[0].missed_days).toBe(4)
      expect(result[0].affected_goals[0].goal_title).toBe('Read 12 books')
    })

    it('does not flag habits with 2 or fewer missed days', async () => {
      const { createClient } = await import('@/lib/supabase/server')

      let callCount = 0
      const mockFrom = vi.fn(() => {
        const builder = createMockQueryBuilder()
        callCount++

        if (callCount === 1) {
          builder.then = vi.fn((resolve: any) => resolve({
            data: [{ habit_id: 'h1', goal_id: 'g1', impact_weight: 0.5 }],
          }))
        } else if (callCount === 2) {
          builder.then = vi.fn((resolve: any) => resolve({
            data: [{ id: 'h1', title: 'Meditate' }],
          }))
        } else if (callCount === 3) {
          builder.then = vi.fn((resolve: any) => resolve({
            data: [{ id: 'g1', title: 'Inner peace' }],
          }))
        } else if (callCount === 4) {
          // 5 completed = 2 missed (7-5=2 < 3, should NOT flag)
          builder.then = vi.fn((resolve: any) => resolve({
            data: Array(5).fill({ status: 'completed', date: '2026-03-01' }),
          }))
        }
        return builder
      })

      vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)

      const result = await CascadeService.detectCascades(USER_ID)
      expect(result.length).toBe(0)
    })

    it('calculates estimated delay as missedDays * weight * 2', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { complete } = await import('@/features/ai/services/ai-provider')
      vi.mocked(complete).mockResolvedValue('{"suggestions":["try again"]}')

      let callCount = 0
      const mockFrom = vi.fn(() => {
        const builder = createMockQueryBuilder()
        callCount++

        if (callCount === 1) {
          builder.then = vi.fn((resolve: any) => resolve({
            data: [{ habit_id: 'h1', goal_id: 'g1', impact_weight: 1.5 }],
          }))
        } else if (callCount === 2) {
          builder.then = vi.fn((resolve: any) => resolve({ data: [{ id: 'h1', title: 'Exercise' }] }))
        } else if (callCount === 3) {
          builder.then = vi.fn((resolve: any) => resolve({ data: [{ id: 'g1', title: 'Marathon' }] }))
        } else if (callCount === 4) {
          // 2 completed = 5 missed
          builder.then = vi.fn((resolve: any) => resolve({
            data: [
              { status: 'completed', date: '2026-03-01' },
              { status: 'completed', date: '2026-03-02' },
            ],
          }))
        } else {
          builder.then = vi.fn((resolve: any) => resolve({ data: null }))
        }
        return builder
      })

      vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)

      const result = await CascadeService.detectCascades(USER_ID)
      expect(result[0].affected_goals[0].estimated_delay_days).toBe(
        Math.round(5 * 1.5 * 2) // 15
      )
    })
  })

  describe('suggestLinks', () => {
    it('returns empty when no habits or goals', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const builder = createMockQueryBuilder()
      builder.then = vi.fn((resolve: any) => resolve({ data: [] }))
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => builder) } as any)

      const result = await CascadeService.suggestLinks(USER_ID)
      expect(result).toEqual([])
    })

    it('returns empty when AI fails', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { complete } = await import('@/features/ai/services/ai-provider')
      vi.mocked(complete).mockRejectedValue(new Error('fail'))

      let callCount = 0
      const mockFrom = vi.fn(() => {
        const builder = createMockQueryBuilder()
        callCount++
        if (callCount === 1) {
          builder.then = vi.fn((resolve: any) => resolve({ data: [{ id: 'h1', title: 'Run' }] }))
        } else {
          builder.then = vi.fn((resolve: any) => resolve({ data: [{ id: 'g1', title: 'Marathon' }] }))
        }
        return builder
      })
      vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)

      const result = await CascadeService.suggestLinks(USER_ID)
      expect(result).toEqual([])
    })
  })

  describe('acknowledge', () => {
    it('calls update on cascade_events', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const builder = createMockQueryBuilder()
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => builder) } as any)

      await CascadeService.acknowledge(USER_ID, 'event-1')
      // No error thrown = success
    })
  })
})
