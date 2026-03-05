import type { PaginationParams } from '@/lib/types'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

// Extracts and validates pagination params from URL search params.
// Returns safe defaults when params are missing or invalid.
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const rawPage = Number(searchParams.get('page'))
  const rawLimit = Number(searchParams.get('limit'))

  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : DEFAULT_PAGE
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1
    ? Math.min(rawLimit, MAX_LIMIT)
    : DEFAULT_LIMIT

  return { page, limit }
}
