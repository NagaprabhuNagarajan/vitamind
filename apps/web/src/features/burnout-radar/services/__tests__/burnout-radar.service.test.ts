import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BurnoutRadarService } from '../burnout-radar.service'
import { createMockQueryBuilder } from '@/test-utils/mock-supabase'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: vi.fn(() => createMockQueryBuilder()),
  })),
}))

vi.mock('@/features/momentum/services/momentum.service', () => ({
  MomentumService: {
    computeComponents: vi.fn(),
  },
}))

vi.mock('@/features/ai/services/ai-provider', () => ({
  complete: vi.fn(),
}))

const USER_ID = 'user-123'

describe('BurnoutRadarService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateRecoveryPlan', () => {
    it('returns null when risk level is below 50', async () => {
      const signals = {
        declining_velocity: false,
        broken_streaks: 0,
        growing_backlog: false,
        stalled_goals: 0,
        high_overdue_pressure: false,
        low_habit_consistency: false,
      }

      const result = await BurnoutRadarService.generateRecoveryPlan(USER_ID, 30, signals)
      expect(result).toBeNull()
    })

    it('generates recovery plan when risk is 50+', async () => {
      const { complete } = await import('@/features/ai/services/ai-provider')
      vi.mocked(complete).mockResolvedValue('- Take a break\n- Focus on one task')

      // Mock supabase for recovery plan context queries
      const { createClient } = await import('@/lib/supabase/server')
      const builder = createMockQueryBuilder()
      builder.then = vi.fn((resolve: any) => resolve({ data: [] }))
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => builder) } as any)

      const signals = {
        declining_velocity: true,
        broken_streaks: 2,
        growing_backlog: true,
        stalled_goals: 1,
        high_overdue_pressure: true,
        low_habit_consistency: false,
      }

      const result = await BurnoutRadarService.generateRecoveryPlan(USER_ID, 75, signals)
      expect(result).toBe('- Take a break\n- Focus on one task')
      expect(complete).toHaveBeenCalled()
    })

    it('returns fallback when AI fails', async () => {
      const { complete } = await import('@/features/ai/services/ai-provider')
      vi.mocked(complete).mockRejectedValue(new Error('AI unavailable'))

      const { createClient } = await import('@/lib/supabase/server')
      const builder = createMockQueryBuilder()
      builder.then = vi.fn((resolve: any) => resolve({ data: [] }))
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => builder) } as any)

      const signals = {
        declining_velocity: false,
        broken_streaks: 0,
        growing_backlog: false,
        stalled_goals: 0,
        high_overdue_pressure: false,
        low_habit_consistency: false,
      }

      const result = await BurnoutRadarService.generateRecoveryPlan(USER_ID, 80, signals)
      expect(result).toContain('Take a break')
    })
  })

  describe('getRadar', () => {
    it('returns existing alert if one exists for today', async () => {
      const today = new Date().toISOString().split('T')[0]
      const existingAlert = {
        id: 'a1',
        user_id: USER_ID,
        date: today,
        risk_level: 65,
        signals: { declining_velocity: true, broken_streaks: 1, growing_backlog: false, stalled_goals: 0, high_overdue_pressure: false, low_habit_consistency: false },
        recovery_plan: 'Take a break',
        acknowledged: false,
      }

      const { createClient } = await import('@/lib/supabase/server')

      let callCount = 0
      const mockFrom = vi.fn(() => {
        const builder = createMockQueryBuilder()
        callCount++
        if (callCount === 1) {
          // First call: check for existing alert
          builder.then = vi.fn((resolve: any) => resolve({ data: existingAlert }))
        } else {
          // Second call: history
          builder.then = vi.fn((resolve: any) => resolve({ data: [] }))
        }
        return builder
      })

      vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)

      const result = await BurnoutRadarService.getRadar(USER_ID)
      expect(result.current_risk).toBe(65)
      expect(result.signals.declining_velocity).toBe(true)
      expect(result.recovery_plan).toBe('Take a break')
    })
  })

  describe('risk level calculation', () => {
    it('adds signal bonuses to base burnout risk', async () => {
      const { MomentumService } = await import('@/features/momentum/services/momentum.service')
      vi.mocked(MomentumService.computeComponents).mockResolvedValue({
        taskVelocity: 20,
        habitConsistency: 20,
        goalTrajectory: 50,
        overduePressure: 80,
        burnoutRisk: 60, // base
      })

      const { createClient } = await import('@/lib/supabase/server')
      const builder = createMockQueryBuilder()
      builder.then = vi.fn((resolve: any) => resolve({ data: [], count: 0 }))
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => builder) } as any)

      const { signals, riskLevel } = await BurnoutRadarService.detectSignals(USER_ID)

      // Base 60 + potential signal bonuses
      expect(riskLevel).toBeGreaterThanOrEqual(60)
      expect(riskLevel).toBeLessThanOrEqual(100)
      expect(typeof signals.declining_velocity).toBe('boolean')
      expect(typeof signals.broken_streaks).toBe('number')
    })
  })
})
