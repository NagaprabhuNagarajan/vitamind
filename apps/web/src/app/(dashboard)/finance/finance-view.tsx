'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, Wallet } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface FinancialEntry {
  id: string
  type: 'income' | 'expense'
  amount: number
  currency: string
  category: string
  description: string | null
  date: string
}

interface MonthlySummary {
  month: string
  total_income: number
  total_expense: number
  net: number
  top_expense_category: string | null
  by_category: Record<string, number>
}

interface FinanceData {
  entries: FinancialEntry[]
  summary: MonthlySummary
  categories: { expense: string[]; income: string[] }
}

const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }

function fmt(amount: number, currency = 'INR') {
  return `${CURRENCY_SYMBOL[currency] ?? currency}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function FinanceView() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    currency: 'INR',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/finance?month=${month}`)
      const json = await res.json()
      if (json.data) setData(json.data)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || !form.category) return
    setSubmitting(true)
    try {
      await fetch('/api/v1/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      })
      setShowForm(false)
      setForm({ type: 'expense', amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0], currency: 'INR' })
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/v1/finance/${id}`, { method: 'DELETE' })
    await load()
  }

  const summary = data?.summary
  const categories = form.type === 'income' ? (data?.categories.income ?? []) : (data?.categories.expense ?? [])

  return (
    <div className="space-y-6">
      {/* Month picker + Add button */}
      <div className="flex items-center justify-between">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input w-auto"
        />
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add entry
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Income</p>
              <p className="text-lg font-semibold text-green-400">{fmt(summary.total_income)}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Expenses</p>
              <p className="text-lg font-semibold text-red-400">{fmt(summary.total_expense)}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: summary.net >= 0 ? 'rgba(99,102,241,0.15)' : 'rgba(239,68,68,0.1)' }}>
              {summary.net >= 0
                ? <TrendingUp className="w-5 h-5 text-primary" />
                : <Minus className="w-5 h-5 text-red-400" />}
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Net savings</p>
              <p className={`text-lg font-semibold ${summary.net >= 0 ? 'text-primary' : 'text-red-400'}`}>
                {summary.net >= 0 ? '' : '-'}{fmt(summary.net)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expense breakdown */}
      {summary && Object.keys(summary.by_category).length > 0 && (
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">Expense breakdown</h3>
          {Object.entries(summary.by_category)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amount]) => {
              const pct = summary.total_expense > 0 ? (amount / summary.total_expense) * 100 : 0
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize text-text-secondary">{cat}</span>
                    <span className="text-text-primary">{fmt(amount)} ({Math.round(pct)}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-secondary">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Entries list */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="space-y-2">
          {(data?.entries ?? []).length === 0 ? (
            <div className="card p-8 text-center space-y-2">
              <Wallet className="w-8 h-8 mx-auto text-text-tertiary" />
              <p className="text-text-secondary text-sm">No entries for {month}. Add your first income or expense.</p>
            </div>
          ) : (
            (data?.entries ?? []).map((entry) => (
              <div key={entry.id} className="card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: entry.type === 'income' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', color: entry.type === 'income' ? '#4ade80' : '#f87171' }}
                  >
                    {entry.type === 'income' ? '+' : '-'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary capitalize">{entry.category}{entry.description ? ` — ${entry.description}` : ''}</p>
                    <p className="text-xs text-text-tertiary">{entry.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${entry.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {entry.type === 'income' ? '+' : '-'}{fmt(entry.amount, entry.currency)}
                  </span>
                  <button onClick={() => handleDelete(entry.id)} className="btn-ghost p-1 text-text-tertiary hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add entry modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-text-primary">Add entry</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t, category: '' }))}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors capitalize ${form.type === t ? 'bg-primary text-white' : 'bg-surface-secondary text-text-secondary'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder="Amount"
                min="0.01"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="input"
              />
              <select
                required
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="input"
              >
                <option value="">Select category</option>
                {categories.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
              <input
                type="text"
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="input"
              />
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="input"
              />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? <Spinner size="sm" /> : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
