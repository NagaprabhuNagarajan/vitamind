import { createClient } from '@/lib/supabase/server'
import type { Habit, HabitLog, PaginationParams, PaginatedResult } from '@/lib/types'
import type { CreateHabitInput, UpdateHabitInput } from '../types'

export class HabitRepository {
  private static HABITS = 'habits'
  private static LOGS = 'habit_logs'

  static async findAll(userId: string, pagination?: PaginationParams): Promise<PaginatedResult<Habit>> {
    const supabase = await createClient()
    const page = pagination?.page ?? 1
    const limit = pagination?.limit ?? 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await supabase
      .from(this.HABITS)
      .select('*', { count: 'exact', head: false })
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .range(from, to)

    if (error) throw new Error(error.message)
    return { data: data as Habit[], total: count ?? 0 }
  }

  static async findById(id: string, userId: string): Promise<Habit | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(this.HABITS)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(error.message)
    return data as Habit
  }

  static async create(userId: string, input: CreateHabitInput): Promise<Habit> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(this.HABITS)
      .insert({ ...input, user_id: userId })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as Habit
  }

  static async update(id: string, userId: string, input: UpdateHabitInput): Promise<Habit> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(this.HABITS)
      .update(input)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as Habit
  }

  static async delete(id: string, userId: string): Promise<void> {
    // Soft delete — mark inactive instead of hard delete (preserves log history)
    await this.update(id, userId, { is_active: false })
  }

  // ─── Habit Logs ───────────────────────────────────────────────────────────

  static async findTodayLog(habitId: string, userId: string): Promise<HabitLog | null> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from(this.LOGS)
      .select('*')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('date', today)
      .single()
    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(error.message)
    return data as HabitLog
  }

  static async upsertLog(habitId: string, userId: string, date: string, status: string): Promise<HabitLog> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(this.LOGS)
      .upsert({ habit_id: habitId, user_id: userId, date, status }, { onConflict: 'habit_id,date' })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as HabitLog
  }

  // Fetch last N days of logs for streak calculation
  static async findRecentLogs(habitId: string, days = 90): Promise<HabitLog[]> {
    const supabase = await createClient()
    const since = new Date()
    since.setDate(since.getDate() - days)
    const { data, error } = await supabase
      .from(this.LOGS)
      .select('*')
      .eq('habit_id', habitId)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return data as HabitLog[]
  }

  // Batch: fetch today's logs for all habits at once (1 query, not N)
  static async findTodayLogsForUser(userId: string): Promise<HabitLog[]> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from(this.LOGS)
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
    if (error) throw new Error(error.message)
    return data as HabitLog[]
  }
}
