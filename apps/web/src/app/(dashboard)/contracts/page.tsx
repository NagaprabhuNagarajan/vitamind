'use client'

import { useState, useEffect } from 'react'
import {
  Shield, Plus, X, Check, AlertTriangle, MessageSquare, Loader2,
} from 'lucide-react'

interface ContractCheckin {
  date: string
  met: boolean
}

interface Contract {
  id: string
  title: string
  description: string | null
  type: 'goal' | 'habit' | 'custom'
  commitment: string
  stakes: string | null
  stake_amount_cents: number | null
  check_in_frequency: 'daily' | 'weekly' | 'monthly'
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'failed' | 'cancelled'
  progress: number
  misses: number
  checkins: ContractCheckin[]
  streak: number
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [nudges, setNudges] = useState<Record<string, string>>({})
  const [nudgeLoading, setNudgeLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const defaultEnd = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const [form, setForm] = useState({
    title: '', commitment: '', type: 'custom' as 'goal' | 'habit' | 'custom',
    stakes: '', check_in_frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    end_date: defaultEnd, description: '',
  })

  useEffect(() => {
    fetch('/api/v1/contracts')
      .then((res) => res.json())
      .then(({ data }) => setContracts(data?.contracts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    if (!form.title || !form.commitment || !form.end_date) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...form }),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error.message ?? 'Failed to create contract')
        return
      }
      if (json.data?.contract) {
        setContracts((prev) => [{ ...json.data.contract, checkins: [], streak: 0 }, ...prev])
        setShowCreate(false)
        setForm({ title: '', commitment: '', type: 'custom', stakes: '', check_in_frequency: 'weekly', end_date: defaultEnd, description: '' })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create contract')
    } finally {
      setCreating(false)
    }
  }

  async function handleCheckIn(contractId: string, met: boolean) {
    const res = await fetch('/api/v1/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkin', contract_id: contractId, met }),
    })
    const { data } = await res.json()
    if (data?.checkin) {
      setContracts((prev) => prev.map((c) => {
        if (c.id !== contractId) return c
        return {
          ...c,
          checkins: [{ date: data.checkin.date, met: data.checkin.met }, ...c.checkins],
          streak: met ? c.streak + 1 : 0,
          progress: met ? Math.min(c.progress + 5, 100) : c.progress,
          misses: met ? c.misses : c.misses + 1,
        }
      }))
    }
  }

  async function handleCancel(contractId: string) {
    await fetch('/api/v1/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', contract_id: contractId }),
    })
    setContracts((prev) => prev.map((c) => c.id === contractId ? { ...c, status: 'cancelled' as const } : c))
  }

  async function handleNudge(contractId: string) {
    setNudgeLoading(contractId)
    try {
      const res = await fetch('/api/v1/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nudge', contract_id: contractId }),
      })
      const { data } = await res.json()
      if (data?.nudge) setNudges((prev) => ({ ...prev, [contractId]: data.nudge }))
    } finally {
      setNudgeLoading(null)
    }
  }

  const activeContracts = contracts.filter((c) => c.status === 'active')
  const pastContracts = contracts.filter((c) => c.status !== 'active')
  const today = new Date().toISOString().split('T')[0]

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Accountability</h1>
        {[1, 2].map((i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-20 rounded-lg bg-surface-tertiary/30" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Accountability</h1>
          <p className="text-xs text-text-tertiary mt-1">Commit to goals with real stakes</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#C7D2FE',
          }}
        >
          {showCreate ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showCreate ? 'Cancel' : 'New Contract'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card p-6 space-y-4" style={{
          background: 'rgba(99,102,241,0.04)',
          border: '1px solid rgba(99,102,241,0.12)',
        }}>
          <h2 className="text-sm font-semibold text-text-primary">New Accountability Contract</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Contract title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="input text-sm"
            />
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'goal' | 'habit' | 'custom' }))}
              className="input text-sm"
            >
              <option value="custom">Custom</option>
              <option value="goal">Goal-linked</option>
              <option value="habit">Habit-linked</option>
            </select>
          </div>

          <textarea
            placeholder="What do you commit to? (e.g., 'Run 3x per week for 8 weeks')"
            value={form.commitment}
            onChange={(e) => setForm((f) => ({ ...f, commitment: e.target.value }))}
            className="input text-sm w-full"
            rows={2}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              placeholder="Stakes (optional)"
              value={form.stakes}
              onChange={(e) => setForm((f) => ({ ...f, stakes: e.target.value }))}
              className="input text-sm"
            />
            <select
              value={form.check_in_frequency}
              onChange={(e) => setForm((f) => ({ ...f, check_in_frequency: e.target.value as 'daily' | 'weekly' | 'monthly' }))}
              className="input text-sm"
            >
              <option value="daily">Daily check-in</option>
              <option value="weekly">Weekly check-in</option>
              <option value="monthly">Monthly check-in</option>
            </select>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              className="input text-sm"
              min={today}
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={creating || !form.title || !form.commitment || !form.end_date}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #A855F7)',
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? 'Creating...' : 'Create Contract'}
          </button>
        </div>
      )}

      {/* Active contracts */}
      {activeContracts.length > 0 && (
        <div className="space-y-3">
          {activeContracts.map((contract) => {
            const todayCheckin = contract.checkins.find((c) => c.date === today)
            const daysLeft = Math.max(0, Math.ceil((new Date(contract.end_date).getTime() - Date.now()) / 86400000))

            return (
              <div key={contract.id} className="card p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                      background: contract.misses >= 3 ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)',
                      border: `1px solid ${contract.misses >= 3 ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)'}`,
                    }}>
                      <Shield className="w-5 h-5" style={{ color: contract.misses >= 3 ? '#EF4444' : '#818CF8' }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{contract.title}</h3>
                      <p className="text-xs text-text-tertiary mt-0.5">{contract.commitment}</p>
                      {contract.stakes && (
                        <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Stakes: {contract.stakes}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancel(contract.id)}
                    className="text-text-tertiary hover:text-red-400 p-1 transition-colors"
                    title="Cancel contract"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-text-tertiary mb-1">
                    <span>{contract.progress}% met</span>
                    <span>{daysLeft} days left &middot; {contract.streak} streak &middot; {contract.misses} misses</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${contract.progress}%`,
                      background: contract.progress >= 80 ? '#10B981' : contract.progress >= 50 ? '#F59E0B' : '#EF4444',
                    }} />
                  </div>
                </div>

                {/* Check-in dots (last 14) */}
                <div className="flex gap-1">
                  {Array.from({ length: 14 }).map((_, i) => {
                    const ci = contract.checkins[13 - i]
                    return (
                      <div key={i} className="w-3 h-3 rounded-full" style={{
                        background: !ci ? 'rgba(255,255,255,0.06)' : ci.met ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.5)',
                      }} />
                    )
                  })}
                  <span className="text-[9px] text-text-tertiary ml-1">last 14</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!todayCheckin ? (
                    <>
                      <button
                        onClick={() => handleCheckIn(contract.id, true)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#6EE7B7' }}
                      >
                        <Check className="w-3 h-3" /> Met today
                      </button>
                      <button
                        onClick={() => handleCheckIn(contract.id, false)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}
                      >
                        <X className="w-3 h-3" /> Missed
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-text-tertiary">
                      {todayCheckin.met ? 'Checked in today' : 'Missed today'}
                    </span>
                  )}
                  <button
                    onClick={() => handleNudge(contract.id)}
                    disabled={nudgeLoading === contract.id}
                    className="ml-auto flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    {nudgeLoading === contract.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                    AI Nudge
                  </button>
                </div>

                {/* AI nudge */}
                {nudges[contract.id] && (
                  <div className="rounded-lg p-3 text-xs text-text-secondary leading-relaxed" style={{
                    background: 'rgba(168,85,247,0.06)',
                    border: '1px solid rgba(168,85,247,0.12)',
                  }}>
                    {nudges[contract.id]}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {activeContracts.length === 0 && !showCreate && (
        <div className="card p-12 text-center space-y-3">
          <Shield className="w-10 h-10 text-text-tertiary mx-auto" />
          <h3 className="text-base font-semibold text-text-primary">No active contracts</h3>
          <p className="text-sm text-text-tertiary max-w-md mx-auto">
            Create an accountability contract to commit to your goals with real stakes.
          </p>
        </div>
      )}

      {/* Past contracts */}
      {pastContracts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">Past Contracts</h2>
          {pastContracts.map((c) => (
            <div key={c.id} className="card p-4 flex items-center justify-between opacity-60">
              <div>
                <p className="text-sm font-medium text-text-primary">{c.title}</p>
                <p className="text-[10px] text-text-tertiary">
                  {c.status} &middot; {c.progress}% met &middot; {c.misses} misses
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                c.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400'
                : c.status === 'failed' ? 'bg-red-500/20 text-red-400'
                : 'bg-white/10 text-text-tertiary'
              }`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
