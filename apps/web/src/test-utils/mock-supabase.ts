import { vi } from 'vitest'

/**
 * Chainable mock for Supabase query builder.
 * All methods return `this` for chaining. Call `mockResult()` to set
 * the value returned by the terminal await / `.single()`.
 */
export function createMockQueryBuilder(defaultResult: unknown = { data: [], error: null, count: 0 }) {
  let result = defaultResult

  const builder: Record<string, unknown> = {}

  const chainMethods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not',
    'order', 'limit', 'range', 'single', 'maybeSingle',
    'filter', 'or', 'is', 'contains', 'containedBy',
  ]

  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder)
  }

  // Terminal: when awaited, return the result
  builder.then = vi.fn((resolve: (v: unknown) => void) => resolve(result))

  // Allow tests to set what this chain returns
  builder.mockResult = (val: unknown) => { result = val }

  return builder
}

/**
 * Creates a mock Supabase client with a `.from()` that returns a chainable builder.
 * Use `getBuilder(tableName)` to configure the result for a specific table.
 */
export function createMockSupabase() {
  const builders = new Map<string, ReturnType<typeof createMockQueryBuilder>>()

  function getBuilder(table: string) {
    if (!builders.has(table)) {
      builders.set(table, createMockQueryBuilder())
    }
    return builders.get(table)!
  }

  const client = {
    from: vi.fn((table: string) => getBuilder(table)),
  }

  return { client, getBuilder }
}
