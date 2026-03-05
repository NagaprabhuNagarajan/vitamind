import { TaskRepository } from '../repositories/task.repository'
import { Errors } from '@/lib/api/errors'
import type { Task, PaginationParams, PaginatedResult } from '@/lib/types'
import type { CreateTaskInput, UpdateTaskInput, TaskFilters } from '../types'

// Business logic layer — validation, rules, orchestration
export class TaskService {
  static async getAll(
    userId: string,
    filters?: TaskFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Task>> {
    return TaskRepository.findAll(userId, filters, pagination)
  }

  static async getById(id: string, userId: string): Promise<Task> {
    const task = await TaskRepository.findById(id, userId)
    if (!task) throw Errors.notFound('Task')
    return task
  }

  static async create(userId: string, input: CreateTaskInput): Promise<Task> {
    if (!input.title?.trim()) throw Errors.badRequest('Title is required')
    return TaskRepository.create(userId, { ...input, title: input.title.trim() })
  }

  static async update(id: string, userId: string, input: UpdateTaskInput): Promise<Task> {
    await this.getById(id, userId)
    if (input.title !== undefined && !input.title.trim()) {
      throw Errors.badRequest('Title cannot be empty')
    }
    const patch: UpdateTaskInput & { completed_at?: string | null } = { ...input }
    if (input.status === 'completed') {
      patch.completed_at = new Date().toISOString()
    } else if (input.status) {
      patch.completed_at = null
    }
    return TaskRepository.update(id, userId, patch)
  }

  static async complete(id: string, userId: string): Promise<Task> {
    return this.update(id, userId, { status: 'completed' })
  }

  static async delete(id: string, userId: string): Promise<void> {
    await this.getById(id, userId)
    return TaskRepository.delete(id, userId)
  }

  static async getTodayAndOverdue(userId: string) {
    return TaskRepository.findTodayAndOverdue(userId)
  }
}
