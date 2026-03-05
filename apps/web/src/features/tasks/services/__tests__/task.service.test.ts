import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskService } from '../task.service'
import { TaskRepository } from '../../repositories/task.repository'
import { ApiError } from '@/lib/api/errors'
import type { Task } from '@/lib/types'

// Mock the repository — we test service logic, not DB access
vi.mock('../../repositories/task.repository')

const MOCK_USER = 'user-123'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: MOCK_USER,
    goal_id: null,
    title: 'Ship feature',
    description: null,
    priority: 'medium',
    status: 'todo',
    due_date: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('TaskService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ─── getAll ─────────────────────────────────────────────────────────────────
  describe('getAll', () => {
    it('delegates to TaskRepository.findAll and returns the result', async () => {
      const tasks = [makeTask()]
      vi.mocked(TaskRepository.findAll).mockResolvedValue({ data: tasks, total: 1 })

      const result = await TaskService.getAll(MOCK_USER)
      expect(result).toEqual({ data: tasks, total: 1 })
      expect(TaskRepository.findAll).toHaveBeenCalledWith(MOCK_USER, undefined, undefined)
    })

    it('passes filters and pagination through', async () => {
      vi.mocked(TaskRepository.findAll).mockResolvedValue({ data: [], total: 0 })
      await TaskService.getAll(
        MOCK_USER,
        { status: 'completed', priority: 'high' },
        { page: 2, limit: 10 },
      )
      expect(TaskRepository.findAll).toHaveBeenCalledWith(
        MOCK_USER,
        { status: 'completed', priority: 'high' },
        { page: 2, limit: 10 },
      )
    })
  })

  // ─── getById ────────────────────────────────────────────────────────────────
  describe('getById', () => {
    it('returns the task when found', async () => {
      const task = makeTask()
      vi.mocked(TaskRepository.findById).mockResolvedValue(task)

      const result = await TaskService.getById('task-1', MOCK_USER)
      expect(result).toBe(task)
    })

    it('throws notFound when repository returns null', async () => {
      vi.mocked(TaskRepository.findById).mockResolvedValue(null)

      await expect(TaskService.getById('nope', MOCK_USER)).rejects.toThrow(ApiError)
      await expect(TaskService.getById('nope', MOCK_USER)).rejects.toThrow('Task not found')
    })
  })

  // ─── create ─────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates a task with trimmed title', async () => {
      const created = makeTask({ title: 'Trimmed' })
      vi.mocked(TaskRepository.create).mockResolvedValue(created)

      const result = await TaskService.create(MOCK_USER, {
        title: '  Trimmed  ',
        priority: 'medium',
      })

      expect(result).toBe(created)
      expect(TaskRepository.create).toHaveBeenCalledWith(MOCK_USER, {
        title: 'Trimmed',
        priority: 'medium',
      })
    })

    it('throws badRequest when title is empty', async () => {
      await expect(
        TaskService.create(MOCK_USER, { title: '', priority: 'low' }),
      ).rejects.toThrow('Title is required')
    })

    it('throws badRequest when title is only whitespace', async () => {
      await expect(
        TaskService.create(MOCK_USER, { title: '   ', priority: 'low' }),
      ).rejects.toThrow('Title is required')
    })

    it('throws badRequest when title is undefined-ish', async () => {
      await expect(
        TaskService.create(MOCK_USER, { title: undefined as unknown as string, priority: 'low' }),
      ).rejects.toThrow('Title is required')
    })
  })

  // ─── update ─────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('updates a task and returns the result', async () => {
      const existing = makeTask()
      const updated = makeTask({ title: 'New title' })
      vi.mocked(TaskRepository.findById).mockResolvedValue(existing)
      vi.mocked(TaskRepository.update).mockResolvedValue(updated)

      const result = await TaskService.update('task-1', MOCK_USER, { title: 'New title' })
      expect(result).toBe(updated)
    })

    it('throws notFound if task does not exist', async () => {
      vi.mocked(TaskRepository.findById).mockResolvedValue(null)

      await expect(
        TaskService.update('nope', MOCK_USER, { title: 'x' }),
      ).rejects.toThrow('Task not found')
    })

    it('throws badRequest when title is empty string', async () => {
      vi.mocked(TaskRepository.findById).mockResolvedValue(makeTask())

      await expect(
        TaskService.update('task-1', MOCK_USER, { title: '  ' }),
      ).rejects.toThrow('Title cannot be empty')
    })

    it('sets completed_at when status becomes completed', async () => {
      const existing = makeTask()
      vi.mocked(TaskRepository.findById).mockResolvedValue(existing)
      vi.mocked(TaskRepository.update).mockResolvedValue(makeTask({ status: 'completed' }))

      await TaskService.update('task-1', MOCK_USER, { status: 'completed' })

      const updateCall = vi.mocked(TaskRepository.update).mock.calls[0]
      const patch = updateCall[2] as Record<string, unknown>
      expect(patch.completed_at).toBeDefined()
      expect(typeof patch.completed_at).toBe('string')
    })

    it('clears completed_at when status changes away from completed', async () => {
      const existing = makeTask({ status: 'completed' })
      vi.mocked(TaskRepository.findById).mockResolvedValue(existing)
      vi.mocked(TaskRepository.update).mockResolvedValue(makeTask({ status: 'in_progress' }))

      await TaskService.update('task-1', MOCK_USER, { status: 'in_progress' })

      const patch = vi.mocked(TaskRepository.update).mock.calls[0][2] as Record<string, unknown>
      expect(patch.completed_at).toBeNull()
    })

    it('does not touch completed_at when no status is set', async () => {
      vi.mocked(TaskRepository.findById).mockResolvedValue(makeTask())
      vi.mocked(TaskRepository.update).mockResolvedValue(makeTask({ title: 'renamed' }))

      await TaskService.update('task-1', MOCK_USER, { title: 'renamed' })

      const patch = vi.mocked(TaskRepository.update).mock.calls[0][2] as Record<string, unknown>
      expect(patch).not.toHaveProperty('completed_at')
    })
  })

  // ─── complete (convenience method) ──────────────────────────────────────────
  describe('complete', () => {
    it('delegates to update with status completed', async () => {
      vi.mocked(TaskRepository.findById).mockResolvedValue(makeTask())
      vi.mocked(TaskRepository.update).mockResolvedValue(makeTask({ status: 'completed' }))

      const result = await TaskService.complete('task-1', MOCK_USER)
      expect(result.status).toBe('completed')

      const patch = vi.mocked(TaskRepository.update).mock.calls[0][2] as Record<string, unknown>
      expect(patch.status).toBe('completed')
      expect(patch.completed_at).toBeDefined()
    })
  })

  // ─── delete ─────────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('deletes when task exists', async () => {
      vi.mocked(TaskRepository.findById).mockResolvedValue(makeTask())
      vi.mocked(TaskRepository.delete).mockResolvedValue(undefined)

      await TaskService.delete('task-1', MOCK_USER)
      expect(TaskRepository.delete).toHaveBeenCalledWith('task-1', MOCK_USER)
    })

    it('throws notFound when task does not exist', async () => {
      vi.mocked(TaskRepository.findById).mockResolvedValue(null)

      await expect(TaskService.delete('nope', MOCK_USER)).rejects.toThrow('Task not found')
      expect(TaskRepository.delete).not.toHaveBeenCalled()
    })
  })

  // ─── getTodayAndOverdue ─────────────────────────────────────────────────────
  describe('getTodayAndOverdue', () => {
    it('delegates to TaskRepository.findTodayAndOverdue', async () => {
      const result = { today: [makeTask()], overdue: [] }
      vi.mocked(TaskRepository.findTodayAndOverdue).mockResolvedValue(result)

      const data = await TaskService.getTodayAndOverdue(MOCK_USER)
      expect(data).toBe(result)
      expect(TaskRepository.findTodayAndOverdue).toHaveBeenCalledWith(MOCK_USER)
    })
  })
})
