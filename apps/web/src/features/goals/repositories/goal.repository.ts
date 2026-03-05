import { createClient } from '@/lib/supabase/server'
import type { Goal, PaginationParams, PaginatedResult } from '@/lib/types'
import type { CreateGoalInput, UpdateGoalInput } from '../types'

export class GoalRepository {
  private static TABLE = 'goals'

  static async findAll(userId: string, pagination?: PaginationParams): Promise<PaginatedResult<Goal>> {
    const supabase = await createClient()
    const page = pagination?.page ?? 1
    const limit = pagination?.limit ?? 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await supabase
      .from(this.TABLE)
      .select('*', { count: 'exact', head: false })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw new Error(error.message)
    return { data: data as Goal[], total: count ?? 0 }
  }

  static async findById(id: string, userId: string): Promise<Goal | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(this.TABLE)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(error.message)
    return data as Goal
  }

  static async create(userId: string, input: CreateGoalInput): Promise<Goal> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(this.TABLE)
      .insert({ ...input, user_id: userId })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as Goal
  }

  static async update(id: string, userId: string, input: UpdateGoalInput): Promise<Goal> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(this.TABLE)
      .update(input)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as Goal
  }

  static async delete(id: string, userId: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from(this.TABLE)
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }

  // Returns goals with linked task counts — used by dashboard
  static async findAllWithTaskCount(userId: string): Promise<Array<Goal & { task_count: number; completed_count: number }>> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(this.TABLE)
      .select(`*, tasks(count), completed_tasks:tasks!inner(count)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      // Fallback: return goals without task counts
      const { data: goals, error: goalsError } = await supabase
        .from(this.TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (goalsError) throw new Error(goalsError.message)
      return (goals as Goal[]).map((g) => ({ ...g, task_count: 0, completed_count: 0 }))
    }

    return data as Array<Goal & { task_count: number; completed_count: number }>
  }
}
