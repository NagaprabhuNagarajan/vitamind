import { createClient } from '@/lib/supabase/server'

export const EXPENSE_CATEGORIES = [
  'food', 'transport', 'health', 'entertainment', 'utilities',
  'shopping', 'education', 'rent', 'subscriptions', 'other',
] as const

export const INCOME_CATEGORIES = [
  'salary', 'freelance', 'investment', 'gift', 'other',
] as const

export type EntryType = 'income' | 'expense'

export interface FinancialEntry {
  id: string
  user_id: string
  type: EntryType
  amount: number
  currency: string
  category: string
  description: string | null
  date: string
  created_at: string
}

export interface MonthlySummary {
  month: string
  total_income: number
  total_expense: number
  net: number
  top_expense_category: string | null
  by_category: Record<string, number>
}

export class FinanceService {
  static async getEntries(
    userId: string,
    options: { month?: string; type?: EntryType; limit?: number } = {},
  ): Promise<FinancialEntry[]> {
    const supabase = await createClient()
    let query = supabase
      .from('financial_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (options.month) {
      const [year, mon] = options.month.split('-')
      const start = `${year}-${mon}-01`
      const nextMonth = new Date(Number(year), Number(mon), 1)
      const end = nextMonth.toISOString().split('T')[0]
      query = query.gte('date', start).lt('date', end)
    }
    if (options.type) query = query.eq('type', options.type)
    if (options.limit) query = query.limit(options.limit)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as FinancialEntry[]
  }

  static async addEntry(
    userId: string,
    entry: {
      type: EntryType
      amount: number
      currency?: string
      category: string
      description?: string
      date?: string
    },
  ): Promise<FinancialEntry> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('financial_entries')
      .insert({
        user_id: userId,
        type: entry.type,
        amount: entry.amount,
        currency: entry.currency ?? 'INR',
        category: entry.category,
        description: entry.description ?? null,
        date: entry.date ?? new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) throw error
    return data as FinancialEntry
  }

  static async deleteEntry(userId: string, entryId: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('financial_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId)
    if (error) throw error
  }

  static async getMonthlySummary(userId: string, month: string): Promise<MonthlySummary> {
    const entries = await this.getEntries(userId, { month })

    let total_income = 0
    let total_expense = 0
    const byCategory: Record<string, number> = {}

    for (const e of entries) {
      if (e.type === 'income') {
        total_income += Number(e.amount)
      } else {
        total_expense += Number(e.amount)
        byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount)
      }
    }

    const top_expense_category =
      Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    return {
      month,
      total_income,
      total_expense,
      net: total_income - total_expense,
      top_expense_category,
      by_category: byCategory,
    }
  }
}
