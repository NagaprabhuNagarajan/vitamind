import { GoalRepository } from '../repositories/goal.repository'
import { Errors } from '@/lib/api/errors'
import type { Goal, PaginationParams, PaginatedResult } from '@/lib/types'
import type { CreateGoalInput, UpdateGoalInput } from '../types'

export class GoalService {
  static async getAll(userId: string, pagination?: PaginationParams): Promise<PaginatedResult<Goal>> {
    return GoalRepository.findAll(userId, pagination)
  }

  static async getById(id: string, userId: string): Promise<Goal> {
    const goal = await GoalRepository.findById(id, userId)
    if (!goal) throw Errors.notFound('Goal')
    return goal
  }

  static async create(userId: string, input: CreateGoalInput): Promise<Goal> {
    if (!input.title?.trim()) throw Errors.badRequest('Title is required')
    if (input.progress !== undefined && (input.progress < 0 || input.progress > 100)) {
      throw Errors.badRequest('Progress must be between 0 and 100')
    }
    return GoalRepository.create(userId, { ...input, title: input.title.trim() })
  }

  static async update(id: string, userId: string, input: UpdateGoalInput): Promise<Goal> {
    await this.getById(id, userId)
    if (input.title !== undefined && !input.title.trim()) {
      throw Errors.badRequest('Title cannot be empty')
    }
    if (input.progress !== undefined && (input.progress < 0 || input.progress > 100)) {
      throw Errors.badRequest('Progress must be between 0 and 100')
    }
    // Auto-complete goal when progress reaches 100
    const patch = { ...input }
    if (input.progress === 100) patch.is_completed = true
    return GoalRepository.update(id, userId, patch)
  }

  static async delete(id: string, userId: string): Promise<void> {
    await this.getById(id, userId)
    return GoalRepository.delete(id, userId)
  }
}
