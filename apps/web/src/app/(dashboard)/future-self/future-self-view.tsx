'use client'

import { useState, useEffect } from 'react'
import { Clock, Trash2, Sparkles, Lock, AlertCircle } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { FutureMessage } from '@/features/future-self/services/future-self.service'

const MIN_DATE = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
})()

function formatDeliverAt(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function DaysChip({ days }: { days: number }) {
  if (days < 0) return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>Arrived</span>
  if (days === 0) return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>Today!</span>
  return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{days}d away</span>
}

export function FutureSelfView() {
  const [messages, setMessages] = useState<FutureMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [deliverAt, setDeliverAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { void fetchMessages() }, [])

  async function fetchMessages() {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/future-self')
      const { data } = await res.json()
      setMessages((data as FutureMessage[]) ?? [])
    } catch { /* silent */ } finally { setLoading(false) }
  }

  async function submit() {
    if (!text.trim() || !deliverAt) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/future-self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, deliver_at: deliverAt }),
      })
      const { data, error: err } = await res.json()
      if (err) throw new Error(err.message)
      setMessages((prev) => [...prev, data as FutureMessage].sort((a, b) => a.deliver_at.localeCompare(b.deliver_at)))
      setText('')
      setDeliverAt('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save message')
    } finally { setSubmitting(false) }
  }

  async function deleteMessage(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/v1/future-self/${id}`, { method: 'DELETE' })
      setMessages((prev) => prev.filter((m) => m.id !== id))
    } catch { /* silent */ } finally { setDeletingId(null) }
  }

  const arrived = messages.filter((m) => m.is_past || m.days_until === 0)
  const upcoming = messages.filter((m) => !m.is_past && m.days_until > 0)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Compose */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-text-primary">Write to Your Future Self</h2>
        </div>
        <p className="text-xs text-text-tertiary">Your message is sealed until the delivery date. VitaMind will also generate an AI forecast of what your life may look like by then.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Dear future me, I hope you've been consistent with your morning routine..."
          rows={4}
          className="input w-full resize-none"
        />
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-text-tertiary mb-1 block">Deliver on</label>
            <input
              type="date"
              value={deliverAt}
              min={MIN_DATE}
              onChange={(e) => setDeliverAt(e.target.value)}
              className="input w-full"
            />
          </div>
          <button
            onClick={() => void submit()}
            disabled={submitting || !text.trim() || !deliverAt}
            className="btn-primary flex items-center gap-2 disabled:opacity-40 whitespace-nowrap"
          >
            {submitting ? <><Spinner size="sm" /> Sealing…</> : <><Lock className="w-4 h-4" /> Seal & Send</>}
          </button>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="md" /></div>
      ) : (
        <>
          {/* Arrived messages */}
          {arrived.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Arrived — Open Now</p>
              {arrived.map((m) => (
                <MessageCard key={m.id} message={m} onDelete={deleteMessage} deletingId={deletingId} revealed />
              ))}
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Sealed ({upcoming.length})</p>
              {upcoming.map((m) => (
                <MessageCard key={m.id} message={m} onDelete={deleteMessage} deletingId={deletingId} revealed={false} />
              ))}
            </div>
          )}

          {messages.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-3xl mb-3">⏳</p>
              <p className="text-sm text-text-tertiary">No messages yet. Write your first note to your future self.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MessageCard({ message, onDelete, deletingId, revealed }: {
  message: FutureMessage
  onDelete: (id: string) => void
  deletingId: string | null
  revealed: boolean
}) {
  const [expanded, setExpanded] = useState(revealed)

  return (
    <div
      className="card p-4 space-y-3"
      style={revealed ? { border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.03)' } : {}}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {revealed ? (
            <div className="w-2 h-2 rounded-full bg-green-400" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-text-tertiary" />
          )}
          <span className="text-xs font-medium text-text-secondary">{formatDeliverAt(message.deliver_at)}</span>
          <DaysChip days={message.days_until} />
        </div>
        <div className="flex items-center gap-2">
          {revealed && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="text-xs text-text-tertiary hover:text-text-secondary"
            >
              {expanded ? 'Collapse' : 'Read'}
            </button>
          )}
          <button
            onClick={() => onDelete(message.id)}
            disabled={deletingId === message.id}
            className="p-1 text-text-tertiary hover:text-red-400 transition-colors"
          >
            {deletingId === message.id ? <Spinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {revealed && expanded && (
        <>
          <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{message.message}</p>
          </div>
          {message.ai_forecast && (
            <div className="rounded-lg p-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs text-indigo-300 font-medium">AI Forecast (written {new Date(message.created_at).toLocaleDateString()})</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{message.ai_forecast}</p>
            </div>
          )}
        </>
      )}

      {!revealed && (
        <div className="flex items-center gap-2 text-xs text-text-tertiary" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
          <Lock className="w-3 h-3" /> Message sealed until {formatDeliverAt(message.deliver_at)}
        </div>
      )}
    </div>
  )
}
