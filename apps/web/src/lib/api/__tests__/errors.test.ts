import { describe, it, expect } from 'vitest'
import { ApiError, Errors, errorResponse, successResponse } from '../errors'

describe('ApiError', () => {
  it('creates an error with statusCode, message, and optional code', () => {
    const err = new ApiError(400, 'bad input', 'VALIDATION')
    expect(err.statusCode).toBe(400)
    expect(err.message).toBe('bad input')
    expect(err.code).toBe('VALIDATION')
    expect(err.name).toBe('ApiError')
    expect(err).toBeInstanceOf(Error)
  })

  it('works without an explicit code', () => {
    const err = new ApiError(500, 'boom')
    expect(err.code).toBeUndefined()
  })
})

describe('Errors factory', () => {
  it('unauthorized returns 401', () => {
    const err = Errors.unauthorized()
    expect(err.statusCode).toBe(401)
    expect(err.message).toBe('Unauthorized')
  })

  it('forbidden returns 403', () => {
    const err = Errors.forbidden()
    expect(err.statusCode).toBe(403)
    expect(err.message).toBe('Forbidden')
  })

  it('notFound returns 404 with resource name', () => {
    const err = Errors.notFound('Task')
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('Task not found')
  })

  it('notFound uses default "Resource" when no name given', () => {
    const err = Errors.notFound()
    expect(err.message).toBe('Resource not found')
  })

  it('badRequest returns 400 with custom message', () => {
    const err = Errors.badRequest('Title is required')
    expect(err.statusCode).toBe(400)
    expect(err.message).toBe('Title is required')
  })

  it('internal returns 500 with default message', () => {
    const err = Errors.internal()
    expect(err.statusCode).toBe(500)
    expect(err.message).toBe('Internal server error')
  })

  it('internal accepts a custom message', () => {
    const err = Errors.internal('DB down')
    expect(err.message).toBe('DB down')
  })
})

describe('errorResponse', () => {
  it('returns correct status and body for ApiError', async () => {
    const err = new ApiError(404, 'Not found', 'NOT_FOUND')
    const res = errorResponse(err)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.data).toBeNull()
    expect(body.error.message).toBe('Not found')
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns 500 for unknown errors', async () => {
    const res = errorResponse(new Error('unexpected'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.data).toBeNull()
    expect(body.error.message).toBe('Internal server error')
  })

  it('handles non-Error objects gracefully', async () => {
    const res = errorResponse('string error')
    expect(res.status).toBe(500)
  })
})

describe('successResponse', () => {
  it('wraps data in standard envelope with 200 status', async () => {
    const res = successResponse({ id: '1', title: 'Test' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ id: '1', title: 'Test' })
    expect(body.error).toBeNull()
  })

  it('supports custom status code', async () => {
    const res = successResponse({ id: '1' }, 201)
    expect(res.status).toBe(201)
  })

  it('handles null data', async () => {
    const res = successResponse(null)
    const body = await res.json()
    expect(body.data).toBeNull()
    expect(body.error).toBeNull()
  })

  it('handles array data', async () => {
    const res = successResponse([1, 2, 3])
    const body = await res.json()
    expect(body.data).toEqual([1, 2, 3])
  })
})
