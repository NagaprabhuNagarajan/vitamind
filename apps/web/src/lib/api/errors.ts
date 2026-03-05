// Typed API error responses used across all route handlers

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const Errors = {
  unauthorized: () => new ApiError(401, 'Unauthorized'),
  forbidden: () => new ApiError(403, 'Forbidden'),
  notFound: (resource = 'Resource') => new ApiError(404, `${resource} not found`),
  badRequest: (msg: string) => new ApiError(400, msg),
  internal: (msg = 'Internal server error') => new ApiError(500, msg),
} as const

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { data: null, error: { message: error.message, code: error.code } },
      { status: error.statusCode },
    )
  }
  console.error('[API Error]', error)
  return Response.json(
    { data: null, error: { message: 'Internal server error' } },
    { status: 500 },
  )
}

export function successResponse<T>(data: T, status = 200): Response {
  return Response.json({ data, error: null }, { status })
}

export function paginatedResponse<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number },
): Response {
  return Response.json({
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
    error: null,
  })
}
