import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GoalService } from '../goal.service'
import { GoalRepository } from '../../repositories/goal.repository'
import { ApiError } from '@/lib/api/errors'
import type { Goal } from '@/lib/types'

vi.mock('../../repositories/goal.repository')

const MOCK_USER = 'user-456'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    user_id: MOCK_USER,
    title: 'Learn Rust',
    description: null,
    target_date: '2026-06-01',
    progress: 25,
    is_completed: false,
    domain: 'personal',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('GoalService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ─── getAll ─────────────────────────────────────────────────────────────────
  describe('getAll', () => {
    it('returns all goals for user', async () => {
      const goals = [makeGoal()]
      vi.mocked(GoalRepository.findAll).mockResolvedValue({ data: goals, total: 1 })

      const result = await GoalService.getAll(MOCK_USER)
      expect(result).toEqual({ data: goals, total: 1 })
      expect(GoalRepository.findAll).toHaveBeenCalledWith(MOCK_USER, undefined)
    })

    it('returns empty data when no goals exist', async () => {
      vi.mocked(GoalRepository.findAll).mockResolvedValue({ data: [], total: 0 })
      const result = await GoalService.getAll(MOCK_USER)
      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  // ─── getById ────────────────────────────────────────────────────────────────
  describe('getById', () => {
    it('returns the goal when found', async () => {
      const goal = makeGoal()
      vi.mocked(GoalRepository.findById).mockResolvedValue(goal)

      expect(await GoalService.getById('goal-1', MOCK_USER)).toBe(goal)
    })

    it('throws notFound when goal does not exist', async () => {
      vi.mocked(GoalRepository.findById).mockResolvedValue(null)

      await expect(GoalService.getById('nope', MOCK_USER)).rejects.toThrow(ApiError)
      await expect(GoalService.getById('nope', MOCK_USER)).rejects.toThrow('Goal not found')
    })
  })

  // ─── create ─────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates a goal with trimmed title', async () => {
      const created = makeGoal({ title: 'Learn Rust' })
      vi.mocked(GoalRepository.create).mockResolvedValue(created)

      await GoalService.create(MOCK_USER, { title: '  Learn Rust  ' })

      expect(GoalRepository.create).toHaveBeenCalledWith(MOCK_USER, { title: 'Learn Rust' })
    })

    it('throws badRequest on empty title', async () => {
      await expect(
        GoalService.create(MOCK_USER, { title: '' }),
      ).rejects.toThrow('Title is required')
    })

    it('throws badRequest on whitespace-only title', async () => {
      await expect(
        GoalService.create(MOCK_USER, { title: '   ' }),
      ).rejects.toThrow('Title is required')
    })

    it('throws badRequest when progress is negative', async () => {
      await expect(
        GoalService.create(MOCK_USER, { title: 'Test', progress: -5 }),
      ).rejects.toThrow('Progress must be between 0 and 100')
    })

    it('throws badRequest when progress exceeds 100', async () => {
      await expect(
        GoalService.create(MOCK_USER, { title: 'Test', progress: 150 }),
      ).rejects.toThrow('Progress must be between 0 and 100')
    })

    it('allows progress of 0', async () => {
      vi.mocked(GoalRepository.create).mockResolvedValue(makeGoal({ progress: 0 }))
      await GoalService.create(MOCK_USER, { title: 'Test', progress: 0 })
      expect(GoalRepository.create).toHaveBeenCalled()
    })

    it('allows progress of 100', async () => {
      vi.mocked(GoalRepository.create).mockResolvedValue(makeGoal({ progress: 100 }))
      await GoalService.create(MOCK_USER, { title: 'Test', progress: 100 })
      expect(GoalRepository.create).toHaveBeenCalled()
    })
  })

  // ─── update ─────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('updates a goal field', async () => {
      vi.mocked(GoalRepository.findById).mockResolvedValue(makeGoal())
      vi.mocked(GoalRepository.update).mockResolvedValue(makeGoal({ title: 'New title' }))

      const result = await GoalService.update('goal-1', MOCK_USER, { title: 'New title' })
      expect(result.title).toBe('New title')
    })

    it('throws notFound if goal does not exist', async () => {
      vi.mocked(GoalRepository.findById).mockResolvedValue(null)
      await expect(
        GoalService.update('nope', MOCK_USER, { title: 'x' }),
      ).rejects.toThrow('Goal not found')
    })

    it('throws badRequest when title is empty', async () => {
      vi.mocked(GoalRepository.findById).mockResolvedValue(makeGoal())
      await expect(
        GoalService.update('goal-1', MOCK_USER, { title: '  ' }),
      ).rejects.toThrow('Title cannot be empty')
    })

    it('throws badRequest when progress is out of range', async () => {
      vi.mocked(GoalRepository.findById).mockResolvedValue(makeGoal())

      await expect(
        GoalService.update('goal-1', MOCK_USER, { progress: -1 }),
      ).rejects.toThrow('Progress must be between 0 and 100')

      await expect(
        GoalService.update('goal-1', MOCK_USER, { progress: 101 }),
      ).rejects.toThrow('Progress must be between 0 and 100')
    })

    it('auto-completes goal when progress reaches 100', async () => {
      vi.mocked(GoalRepository.findById).mockResolvedValue(makeGoal())
      vi.mocked(GoalRepository.update).mockResolvedValue(
        makeGoal({ progress: 100, is_completed: true }),
      )

      await GoalService.update('goal-1', MOCK_USER, { progress: 100 })

      const patch = vi.mocked(GoalRepository.update).mock.calls[0][2]
      expect(patch.progress).toBe(100)
      expect(patch.is_completed).toBe(true)
    })

    it('does not auto-complete when progress is below 100', async () => {
      vi.mocked(GoalRepository.findById).mockResolvedValue(makeGoal())
      vi.mocked(GoalRepository.update).mockResolvedValue(makeGoal({ progress: 50 }))

      await GoalService.update('goal-1', MOCK_USER, { progress: 50 })

      const patch = vi.mocked(GoalRepository.update).mock.calls[0][2]
      expect(patch.is_completed).toBeUndefined()
    })
  })

  // ─── delete ─────────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('deletes when goal exists', async () => {
      vi.mocked(GoalRepository.findById).mockResolvedValue(makeGoal())
      vi.mocked(GoalRepository.delete).mockResolvedValue(undefined)

      await GoalService.delete('goal-1', MOCK_USER)
      expect(GoalRepository.delete).toHaveBeenCalledWith('goal-1', MOCK_USER)
    })

    it('throws notFound if goal does not exist', async () => {
      vi.mocked(GoalRepository.findById).mockResolvedValue(null)
      await expect(GoalService.delete('nope', MOCK_USER)).rejects.toThrow('Goal not found')
    })
  })
})
