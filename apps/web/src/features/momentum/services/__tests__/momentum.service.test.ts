import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MomentumService } from '../momentum.service'
import { createMockSupabase, createMockQueryBuilder } from '@/test-utils/mock-supabase'

// Mock the Supabase client
const mockSupabase = createMockSupabase()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase.client)),
}))

const USER_ID = 'user-123'

describe('MomentumService', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    // Reset mock client
    Object.assign(mockSupabase, createMockSupabase())
    const { createClient } = vi.mocked(await import('@/lib/supabase/server'))
    createClient.mockResolvedValue(mockSupabase.client as any)
  })

  describe('computeComponents', () => {
    function setupComponentMocks(opts: {
      completedTasks?: number
      recentTasks?: number
      overdueTasks?: number
      activeHabits?: number
      habitLogs?: number
      goals?: Array<{ progress: number; target_date?: string; is_completed: boolean }>
    }) {
      const {
        completedTasks = 5,
        recentTasks = 10,
        overdueTasks = 0,
        activeHabits = 3,
        habitLogs = 15,
        goals = [],
      } = opts

      // Each .from() call returns a fresh builder
      let callIndex = 0
      mockSupabase.client.from = vi.fn(() => {
        const builder = createMockQueryBuilder()
        callIndex++

        // The service makes 7 chained queries via Promise.all and sequential calls
        // We use the `then` mock to return appropriate data
        if (callIndex === 1) {
          // completedTasks
          builder.then = vi.fn((resolve: any) => resolve({ data: Array(completedTasks).fill({ id: 'x' }) }))
        } else if (callIndex === 2) {
          // allRecentTasks
          builder.then = vi.fn((resolve: any) => resolve({ data: Array(recentTasks).fill({ id: 'x' }) }))
        } else if (callIndex === 3) {
          // overdueTasks
          builder.then = vi.fn((resolve: any) => resolve({ data: Array(overdueTasks).fill({ id: 'x', due_date: '2026-01-01' }) }))
        } else if (callIndex === 4) {
          // activeHabits
          builder.then = vi.fn((resolve: any) => resolve({ data: Array(activeHabits).fill({ id: 'h1' }) }))
        } else if (callIndex === 5) {
          // habitLogs
          builder.then = vi.fn((resolve: any) => resolve({ data: Array(habitLogs).fill({ id: 'l1' }) }))
        } else if (callIndex === 6) {
          // goals
          builder.then = vi.fn((resolve: any) => resolve({ data: goals }))
        }

        return builder
      }) as any
    }

    it('computes score with balanced data', async () => {
      setupComponentMocks({
        completedTasks: 7,
        recentTasks: 10,
        overdueTasks: 0,
        activeHabits: 2,
        habitLogs: 10, // 10 out of 14 possible = ~71%
        goals: [{ progress: 60, is_completed: false }],
      })

      const result = await MomentumService.computeComponents(USER_ID)

      expect(result.taskVelocity).toBe(70) // 7/10 * 100 = 70, - 0*5 = 70
      expect(result.habitConsistency).toBe(71) // 10/14 * 100 = 71
      expect(result.overduePressure).toBe(0) // 0 * 15 = 0
      expect(result.burnoutRisk).toBeGreaterThanOrEqual(0)
      expect(result.burnoutRisk).toBeLessThanOrEqual(100)
    })

    it('clamps taskVelocity to 0-100', async () => {
      setupComponentMocks({
        completedTasks: 200,
        recentTasks: 10,
        overdueTasks: 0,
      })

      const result = await MomentumService.computeComponents(USER_ID)
      expect(result.taskVelocity).toBeLessThanOrEqual(100)
      expect(result.taskVelocity).toBeGreaterThanOrEqual(0)
    })

    it('returns 50 for goalTrajectory when no goals exist', async () => {
      setupComponentMocks({ goals: [] })

      const result = await MomentumService.computeComponents(USER_ID)
      expect(result.goalTrajectory).toBe(50)
    })

    it('penalizes overdue tasks in velocity and pressure', async () => {
      setupComponentMocks({
        completedTasks: 5,
        recentTasks: 10,
        overdueTasks: 4,
      })

      const result = await MomentumService.computeComponents(USER_ID)
      // taskVelocity = (5/10)*100 - 4*5 = 50 - 20 = 30
      expect(result.taskVelocity).toBe(30)
      // overduePressure = 4 * 15 = 60
      expect(result.overduePressure).toBe(60)
    })

    it('caps overduePressure at 100', async () => {
      setupComponentMocks({ overdueTasks: 10 })

      const result = await MomentumService.computeComponents(USER_ID)
      expect(result.overduePressure).toBe(100) // 10 * 15 = 150, capped at 100
    })

    it('defaults habitConsistency to 50 when no active habits', async () => {
      setupComponentMocks({ activeHabits: 0, habitLogs: 0 })

      const result = await MomentumService.computeComponents(USER_ID)
      expect(result.habitConsistency).toBe(50)
    })

    it('calculates burnout risk from composite signals', async () => {
      setupComponentMocks({
        completedTasks: 1,
        recentTasks: 10,
        overdueTasks: 5,
        activeHabits: 5,
        habitLogs: 5, // 5/35 = ~14%
      })

      const result = await MomentumService.computeComponents(USER_ID)
      // High overdue (75), low consistency (14), low velocity -> high burnout
      expect(result.burnoutRisk).toBeGreaterThan(50)
    })
  })

  describe('getCurrentScore', () => {
    it('returns existing snapshot if one exists for today', async () => {
      const snapshot = { id: 's1', score: 72, date: new Date().toISOString().split('T')[0] }
      const builder = createMockQueryBuilder()
      builder.then = vi.fn((resolve: any) => resolve({ data: snapshot }))
      mockSupabase.client.from = vi.fn(() => builder) as any

      const result = await MomentumService.getCurrentScore(USER_ID)
      expect(result).toEqual(snapshot)
    })
  })

  describe('getHistory', () => {
    it('returns ordered snapshots for the last N days', async () => {
      const history = [
        { date: '2026-03-01', score: 65 },
        { date: '2026-03-02', score: 70 },
      ]
      const builder = createMockQueryBuilder()
      builder.then = vi.fn((resolve: any) => resolve({ data: history }))
      mockSupabase.client.from = vi.fn(() => builder) as any

      const result = await MomentumService.getHistory(USER_ID, 7)
      expect(result).toEqual(history)
    })

    it('returns empty array when no data', async () => {
      const builder = createMockQueryBuilder()
      builder.then = vi.fn((resolve: any) => resolve({ data: null }))
      mockSupabase.client.from = vi.fn(() => builder) as any

      const result = await MomentumService.getHistory(USER_ID)
      expect(result).toEqual([])
    })
  })
})
