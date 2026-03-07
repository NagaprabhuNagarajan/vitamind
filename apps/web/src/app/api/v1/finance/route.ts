import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse, Errors } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { FinanceService, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/features/finance/services/finance.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
    const type = searchParams.get('type') as 'income' | 'expense' | null

    const [entries, summary] = await Promise.all([
      FinanceService.getEntries(user.id, { month, type: type ?? undefined }),
      FinanceService.getMonthlySummary(user.id, month),
    ])

    return successResponse({ entries, summary, categories: { expense: EXPENSE_CATEGORIES, income: INCOME_CATEGORIES } })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'finance-list', tier: RateLimitTier.standard })))

export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json() as Record<string, unknown>

    const type = body.type === 'income' || body.type === 'expense' ? body.type : null
    if (!type) return errorResponse(Errors.badRequest('type must be income or expense'))

    const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount)
    if (!amount || isNaN(amount) || amount <= 0) return errorResponse(Errors.badRequest('amount must be a positive number'))

    const category = typeof body.category === 'string' ? body.category.trim() : ''
    if (!category) return errorResponse(Errors.badRequest('category is required'))

    const entry = await FinanceService.addEntry(user.id, {
      type,
      amount,
      currency: typeof body.currency === 'string' ? body.currency : 'INR',
      category,
      description: typeof body.description === 'string' ? body.description : undefined,
      date: typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : undefined,
    })

    return successResponse(entry, 201)
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'finance-create', tier: RateLimitTier.standard })))
