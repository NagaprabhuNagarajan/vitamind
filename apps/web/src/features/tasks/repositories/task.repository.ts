import { createClient } from '@/lib/supabase/server'
import type { Task, PaginationParams, PaginatedResult } from '@/lib/types'
import type { CreateTaskInput, UpdateTaskInput, TaskFilters } from '../types'

// Data access layer — all Supabase queries for tasks
// No business logic here, only data operations
export class TaskRepository {
  private static TABLE = 'tasks'

  static async findAll(
    userId: string,
    filters?: TaskFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Task>> {
    const supabase = await createClient()
    const page = pagination?.page ?? 1
    const limit = pagination?.limit ?? 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from(this.TABLE)
      .select('*', { count: 'exact', head: false })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.priority) query = query.eq('priority', filters.priority)
    if (filters?.goal_id) query = query.eq('goal_id', filters.goal_id)
    if (filters?.date) query = query.eq('due_date', filters.date)
    if (filters?.search) query = query.ilike('title', `%${filters.search}%`)

    const { data, error, count } = await query

    if (error) throw new Error(error.message)
    return { data: data as Task[], total: count ?? 0 }
  }

  static async findById(id: string, userId: string): Promise<Task | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from(this.TABLE)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error?.code === 'PGRST116') return null // not found
    if (error) throw new Error(error.message)
    return data as Task
  }

  static async create(userId: string, input: CreateTaskInput): Promise<Task> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from(this.TABLE)
      .insert({ ...input, user_id: userId })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Task
  }

  static async update(id: string, userId: string, input: UpdateTaskInput): Promise<Task> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from(this.TABLE)
      .update(input)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Task
  }

  static async deleteSubtasks(parentId: string, userId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from(this.TABLE)
      .delete()
      .eq('parent_task_id', parentId)
      .eq('user_id', userId)

    if (error) throw new Error(error.message)
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

  // Efficient query for today's tasks used by Dashboard
  static async findTodayAndOverdue(userId: string): Promise<{ today: Task[]; overdue: Task[] }> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from(this.TABLE)
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .lte('due_date', today)
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })

    if (error) throw new Error(error.message)

    const tasks = data as Task[]
    return {
      today: tasks.filter((t) => t.due_date === today),
      overdue: tasks.filter((t) => t.due_date !== null && t.due_date < today),
    }
  }
}
