import { HabitRepository } from '../repositories/habit.repository'
import { Errors } from '@/lib/api/errors'
import { todayISO } from '@/lib/utils'
import type { Habit, HabitLog, PaginationParams, PaginatedResult } from '@/lib/types'
import type { CreateHabitInput, UpdateHabitInput, HabitWithStreak } from '../types'

export class HabitService {
  static async getAll(userId: string, pagination?: PaginationParams): Promise<PaginatedResult<Habit>> {
    return HabitRepository.findAll(userId, pagination)
  }

  static async getById(id: string, userId: string): Promise<Habit> {
    const habit = await HabitRepository.findById(id, userId)
    if (!habit) throw Errors.notFound('Habit')
    return habit
  }

  static async create(userId: string, input: CreateHabitInput): Promise<Habit> {
    if (!input.title?.trim()) throw Errors.badRequest('Title is required')
    return HabitRepository.create(userId, { ...input, title: input.title.trim() })
  }

  static async update(id: string, userId: string, input: UpdateHabitInput): Promise<Habit> {
    await this.getById(id, userId)
    if (input.title !== undefined && !input.title.trim()) {
      throw Errors.badRequest('Title cannot be empty')
    }
    return HabitRepository.update(id, userId, input)
  }

  static async delete(id: string, userId: string): Promise<void> {
    await this.getById(id, userId)
    return HabitRepository.delete(id, userId)
  }

  // ─── Habit Logging ────────────────────────────────────────────────────────

  static async logToday(habitId: string, userId: string, status: 'completed' | 'skipped'): Promise<HabitLog> {
    await this.getById(habitId, userId)
    return HabitRepository.upsertLog(habitId, userId, todayISO(), status)
  }

  // ─── Streak Calculation ───────────────────────────────────────────────────
  // Pure in-app calculation — avoids repeated DB function calls

  static calculateStreak(logs: HabitLog[]): number {
    if (!logs.length) return 0

    // logs are sorted descending by date
    let streak = 0
    const today = todayISO()
    let checkDate = today

    for (const log of logs) {
      if (log.date !== checkDate) break          // gap in dates — streak broken
      if (log.status !== 'completed') break      // skipped/missed — streak broken
      streak++
      // Step back one day
      const d = new Date(checkDate)
      d.setDate(d.getDate() - 1)
      checkDate = d.toISOString().split('T')[0]
    }

    return streak
  }

  // Returns habits enriched with today's log + streak, with pagination metadata
  static async getAllWithStreaks(
    userId: string,
    pagination?: PaginationParams,
  ): Promise<{ data: HabitWithStreak[]; total: number }> {
    const [habitsResult, todayLogs] = await Promise.all([
      HabitRepository.findAll(userId, pagination),
      HabitRepository.findTodayLogsForUser(userId),
    ])

    const todayLogMap = new Map(todayLogs.map((l) => [l.habit_id, l]))

    const enriched = await Promise.all(
      habitsResult.data.map(async (habit) => {
        const recentLogs = await HabitRepository.findRecentLogs(habit.id)
        return {
          habit,
          streak: this.calculateStreak(recentLogs),
          todayLog: todayLogMap.get(habit.id) ?? null,
        }
      }),
    )

    return { data: enriched, total: habitsResult.total }
  }
}
