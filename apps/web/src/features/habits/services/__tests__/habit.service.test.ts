import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HabitService } from '../habit.service'
import { HabitRepository } from '../../repositories/habit.repository'
import { ApiError } from '@/lib/api/errors'
import type { Habit, HabitLog } from '@/lib/types'

vi.mock('../../repositories/habit.repository')
// Mock todayISO to return a fixed date for deterministic tests
vi.mock('@/lib/utils', () => ({
  todayISO: () => '2026-03-05',
}))

const MOCK_USER = 'user-789'

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    user_id: MOCK_USER,
    title: 'Meditate',
    description: null,
    frequency: 'daily',
    target_days: null,
    reminder_time: '08:00',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeLog(overrides: Partial<HabitLog> = {}): HabitLog {
  return {
    id: 'log-1',
    habit_id: 'habit-1',
    user_id: MOCK_USER,
    date: '2026-03-05',
    status: 'completed',
    created_at: '2026-03-05T08:00:00Z',
    ...overrides,
  }
}

describe('HabitService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ─── getAll ─────────────────────────────────────────────────────────────────
  describe('getAll', () => {
    it('returns habits from repository', async () => {
      const habits = [makeHabit()]
      vi.mocked(HabitRepository.findAll).mockResolvedValue({ data: habits, total: 1 })

      const result = await HabitService.getAll(MOCK_USER)
      expect(result).toEqual({ data: habits, total: 1 })
    })
  })

  // ─── getById ────────────────────────────────────────────────────────────────
  describe('getById', () => {
    it('returns habit when found', async () => {
      vi.mocked(HabitRepository.findById).mockResolvedValue(makeHabit())
      expect(await HabitService.getById('habit-1', MOCK_USER)).toBeDefined()
    })

    it('throws notFound when null', async () => {
      vi.mocked(HabitRepository.findById).mockResolvedValue(null)
      await expect(HabitService.getById('x', MOCK_USER)).rejects.toThrow('Habit not found')
    })
  })

  // ─── create ─────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates habit with trimmed title', async () => {
      vi.mocked(HabitRepository.create).mockResolvedValue(makeHabit())

      await HabitService.create(MOCK_USER, { title: '  Meditate  ', frequency: 'daily' })
      expect(HabitRepository.create).toHaveBeenCalledWith(MOCK_USER, {
        title: 'Meditate',
        frequency: 'daily',
      })
    })

    it('throws on empty title', async () => {
      await expect(
        HabitService.create(MOCK_USER, { title: '', frequency: 'daily' }),
      ).rejects.toThrow('Title is required')
    })
  })

  // ─── update ─────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('updates and returns', async () => {
      vi.mocked(HabitRepository.findById).mockResolvedValue(makeHabit())
      vi.mocked(HabitRepository.update).mockResolvedValue(makeHabit({ title: 'Run' }))

      const result = await HabitService.update('habit-1', MOCK_USER, { title: 'Run' })
      expect(result.title).toBe('Run')
    })

    it('throws notFound if habit missing', async () => {
      vi.mocked(HabitRepository.findById).mockResolvedValue(null)
      await expect(
        HabitService.update('x', MOCK_USER, { title: 'Run' }),
      ).rejects.toThrow('Habit not found')
    })

    it('throws on empty title update', async () => {
      vi.mocked(HabitRepository.findById).mockResolvedValue(makeHabit())
      await expect(
        HabitService.update('habit-1', MOCK_USER, { title: '  ' }),
      ).rejects.toThrow('Title cannot be empty')
    })
  })

  // ─── delete ─────────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('soft-deletes when habit exists', async () => {
      vi.mocked(HabitRepository.findById).mockResolvedValue(makeHabit())
      vi.mocked(HabitRepository.delete).mockResolvedValue(undefined)

      await HabitService.delete('habit-1', MOCK_USER)
      expect(HabitRepository.delete).toHaveBeenCalledWith('habit-1', MOCK_USER)
    })

    it('throws notFound if habit missing', async () => {
      vi.mocked(HabitRepository.findById).mockResolvedValue(null)
      await expect(HabitService.delete('x', MOCK_USER)).rejects.toThrow('Habit not found')
    })
  })

  // ─── logToday ───────────────────────────────────────────────────────────────
  describe('logToday', () => {
    it('validates habit exists then upserts log', async () => {
      vi.mocked(HabitRepository.findById).mockResolvedValue(makeHabit())
      vi.mocked(HabitRepository.upsertLog).mockResolvedValue(makeLog())

      const result = await HabitService.logToday('habit-1', MOCK_USER, 'completed')
      expect(HabitRepository.upsertLog).toHaveBeenCalledWith(
        'habit-1',
        MOCK_USER,
        '2026-03-05',
        'completed',
      )
      expect(result.status).toBe('completed')
    })

    it('supports skipped status', async () => {
      vi.mocked(HabitRepository.findById).mockResolvedValue(makeHabit())
      vi.mocked(HabitRepository.upsertLog).mockResolvedValue(makeLog({ status: 'skipped' }))

      const result = await HabitService.logToday('habit-1', MOCK_USER, 'skipped')
      expect(result.status).toBe('skipped')
    })

    it('throws if habit does not exist', async () => {
      vi.mocked(HabitRepository.findById).mockResolvedValue(null)
      await expect(
        HabitService.logToday('x', MOCK_USER, 'completed'),
      ).rejects.toThrow('Habit not found')
    })
  })

  // ─── calculateStreak ───────────────────────────────────────────────────────
  describe('calculateStreak', () => {
    it('returns 0 for empty logs', () => {
      expect(HabitService.calculateStreak([])).toBe(0)
    })

    it('counts consecutive completed days from today', () => {
      const logs: HabitLog[] = [
        makeLog({ date: '2026-03-05', status: 'completed' }),
        makeLog({ date: '2026-03-04', status: 'completed' }),
        makeLog({ date: '2026-03-03', status: 'completed' }),
      ]
      expect(HabitService.calculateStreak(logs)).toBe(3)
    })

    it('breaks on skipped day', () => {
      const logs: HabitLog[] = [
        makeLog({ date: '2026-03-05', status: 'completed' }),
        makeLog({ date: '2026-03-04', status: 'skipped' }),
        makeLog({ date: '2026-03-03', status: 'completed' }),
      ]
      expect(HabitService.calculateStreak(logs)).toBe(1)
    })

    it('breaks on gap in dates', () => {
      const logs: HabitLog[] = [
        makeLog({ date: '2026-03-05', status: 'completed' }),
        // missing 2026-03-04
        makeLog({ date: '2026-03-03', status: 'completed' }),
      ]
      expect(HabitService.calculateStreak(logs)).toBe(1)
    })

    it('returns 0 if most recent log is not today', () => {
      const logs: HabitLog[] = [
        makeLog({ date: '2026-03-04', status: 'completed' }),
        makeLog({ date: '2026-03-03', status: 'completed' }),
      ]
      expect(HabitService.calculateStreak(logs)).toBe(0)
    })
  })

  // ─── getAllWithStreaks ──────────────────────────────────────────────────────
  describe('getAllWithStreaks', () => {
    it('enriches habits with streak and today log', async () => {
      const habit = makeHabit()
      const todayLog = makeLog()
      vi.mocked(HabitRepository.findAll).mockResolvedValue({ data: [habit], total: 1 })
      vi.mocked(HabitRepository.findTodayLogsForUser).mockResolvedValue([todayLog])
      vi.mocked(HabitRepository.findRecentLogs).mockResolvedValue([
        makeLog({ date: '2026-03-05' }),
        makeLog({ date: '2026-03-04' }),
      ])

      const result = await HabitService.getAllWithStreaks(MOCK_USER)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].habit).toBe(habit)
      expect(result.data[0].streak).toBe(2)
      expect(result.data[0].todayLog).toBe(todayLog)
      expect(result.total).toBe(1)
    })

    it('returns null todayLog when no log exists today', async () => {
      const habit = makeHabit({ id: 'habit-2' })
      vi.mocked(HabitRepository.findAll).mockResolvedValue({ data: [habit], total: 1 })
      vi.mocked(HabitRepository.findTodayLogsForUser).mockResolvedValue([])
      vi.mocked(HabitRepository.findRecentLogs).mockResolvedValue([])

      const result = await HabitService.getAllWithStreaks(MOCK_USER)
      expect(result.data[0].todayLog).toBeNull()
      expect(result.data[0].streak).toBe(0)
    })
  })
})
