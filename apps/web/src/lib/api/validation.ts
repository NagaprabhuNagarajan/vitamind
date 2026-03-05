// Input validation helpers for API route handlers.
// Each validator returns a sanitized value or throws an ApiError(400).

import { Errors } from './errors'

/**
 * Validates and sanitizes a string field.
 * Trims whitespace and enforces length constraints.
 */
export function validateString(
  value: unknown,
  field: string,
  opts: { minLength?: number; maxLength?: number; required?: boolean } = {},
): string | undefined {
  const { minLength = 0, maxLength, required = false } = opts

  if (value === undefined || value === null || value === '') {
    if (required) throw Errors.badRequest(`${field} is required`)
    return undefined
  }

  if (typeof value !== 'string') {
    throw Errors.badRequest(`${field} must be a string`)
  }

  const trimmed = value.trim()

  if (trimmed.length === 0 && required) {
    throw Errors.badRequest(`${field} is required`)
  }

  if (trimmed.length < minLength) {
    throw Errors.badRequest(`${field} must be at least ${minLength} characters`)
  }

  if (maxLength !== undefined && trimmed.length > maxLength) {
    throw Errors.badRequest(`${field} must be at most ${maxLength} characters`)
  }

  return trimmed
}

/**
 * Validates a value against a fixed set of allowed enum values.
 */
export function validateEnum<T extends string>(
  value: unknown,
  field: string,
  validValues: readonly T[],
  opts: { required?: boolean } = {},
): T | undefined {
  if (value === undefined || value === null || value === '') {
    if (opts.required) throw Errors.badRequest(`${field} is required`)
    return undefined
  }

  if (typeof value !== 'string') {
    throw Errors.badRequest(`${field} must be a string`)
  }

  if (!validValues.includes(value as T)) {
    throw Errors.badRequest(`${field} must be one of: ${validValues.join(', ')}`)
  }

  return value as T
}

/**
 * Validates a numeric field with optional range and integer constraints.
 */
export function validateNumber(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number; integer?: boolean; required?: boolean } = {},
): number | undefined {
  if (value === undefined || value === null || value === '') {
    if (opts.required) throw Errors.badRequest(`${field} is required`)
    return undefined
  }

  const num = typeof value === 'string' ? Number(value) : value

  if (typeof num !== 'number' || isNaN(num)) {
    throw Errors.badRequest(`${field} must be a number`)
  }

  if (opts.integer && !Number.isInteger(num)) {
    throw Errors.badRequest(`${field} must be an integer`)
  }

  if (opts.min !== undefined && num < opts.min) {
    throw Errors.badRequest(`${field} must be at least ${opts.min}`)
  }

  if (opts.max !== undefined && num > opts.max) {
    throw Errors.badRequest(`${field} must be at most ${opts.max}`)
  }

  return num
}

/**
 * Validates a date string in YYYY-MM-DD format.
 * Checks that it parses to a real calendar date.
 */
export function validateDate(
  value: unknown,
  field: string,
  opts: { required?: boolean } = {},
): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (opts.required) throw Errors.badRequest(`${field} is required`)
    return undefined
  }

  if (typeof value !== 'string') {
    throw Errors.badRequest(`${field} must be a string in YYYY-MM-DD format`)
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(value)) {
    throw Errors.badRequest(`${field} must be in YYYY-MM-DD format`)
  }

  // Verify the date is valid (e.g. reject 2024-02-30)
  const parsed = new Date(value + 'T00:00:00Z')
  if (isNaN(parsed.getTime())) {
    throw Errors.badRequest(`${field} is not a valid date`)
  }

  // Confirm round-trip: the parsed date matches the input
  const [y, m, d] = value.split('-').map(Number)
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() + 1 !== m ||
    parsed.getUTCDate() !== d
  ) {
    throw Errors.badRequest(`${field} is not a valid date`)
  }

  return value
}

/**
 * Validates a time string in HH:MM format (24-hour clock, 00:00 to 23:59).
 */
export function validateTime(
  value: unknown,
  field: string,
  opts: { required?: boolean } = {},
): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (opts.required) throw Errors.badRequest(`${field} is required`)
    return undefined
  }

  if (typeof value !== 'string') {
    throw Errors.badRequest(`${field} must be a string in HH:MM format`)
  }

  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/
  if (!timeRegex.test(value)) {
    throw Errors.badRequest(`${field} must be in HH:MM format (00:00 to 23:59)`)
  }

  return value
}

/**
 * Validates an array field with optional per-item validator and max length.
 */
export function validateArray<T>(
  value: unknown,
  field: string,
  opts: { itemValidator?: (item: unknown, index: number) => T; maxLength?: number; required?: boolean } = {},
): T[] | undefined {
  if (value === undefined || value === null) {
    if (opts.required) throw Errors.badRequest(`${field} is required`)
    return undefined
  }

  if (!Array.isArray(value)) {
    throw Errors.badRequest(`${field} must be an array`)
  }

  if (opts.required && value.length === 0) {
    throw Errors.badRequest(`${field} must not be empty`)
  }

  if (opts.maxLength !== undefined && value.length > opts.maxLength) {
    throw Errors.badRequest(`${field} must have at most ${opts.maxLength} items`)
  }

  if (opts.itemValidator) {
    return value.map((item, i) => opts.itemValidator!(item, i))
  }

  return value as T[]
}

/**
 * Validates a UUID v4 string.
 */
export function validateUUID(
  value: unknown,
  field: string,
  opts: { required?: boolean } = {},
): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (opts.required) throw Errors.badRequest(`${field} is required`)
    return undefined
  }

  if (typeof value !== 'string') {
    throw Errors.badRequest(`${field} must be a string`)
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    throw Errors.badRequest(`${field} must be a valid UUID`)
  }

  return value
}

/**
 * Validates a boolean field. Returns undefined if not provided, or the boolean value.
 */
export function validateBoolean(
  value: unknown,
  field: string,
  opts: { required?: boolean } = {},
): boolean | undefined {
  if (value === undefined || value === null) {
    if (opts.required) throw Errors.badRequest(`${field} is required`)
    return undefined
  }

  if (typeof value !== 'boolean') {
    throw Errors.badRequest(`${field} must be a boolean`)
  }

  return value
}

// Domain-specific enum constants for reuse across routes
export const TASK_STATUSES = ['todo', 'in_progress', 'completed', 'cancelled'] as const
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export const HABIT_FREQUENCIES = ['daily', 'weekly', 'weekdays', 'weekends'] as const
export const HABIT_LOG_STATUSES = ['completed', 'skipped', 'missed'] as const
export const CHAT_ROLES = ['user', 'assistant'] as const
