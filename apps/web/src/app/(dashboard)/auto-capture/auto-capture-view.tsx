'use client'

import { useState, useEffect } from 'react'
import { Zap, Calendar, TrendingUp, CheckCircle2, AlertCircle, Plus } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { CaptureSuggestion, QuickLogResult } from '@/features/auto-capture/services/auto-capture.service'

const SOURCE_ICONS = {
  calendar: Calendar,
  pattern: TrendingUp,
}

const TYPE_LABELS: Record<CaptureSuggestion['type'], string> = {
  task: 'Task',
  habit_log: 'Habit',
  health_entry: 'Health',
}

export function AutoCaptureView() {
  const [suggestions, setSuggestions] = useState<CaptureSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)
  const [imported, setImported] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState<string | null>(null)

  const [quickText, setQuickText] = useState('')
  const [quickLoading, setQuickLoading] = useState(false)
  const [quickResult, setQuickResult] = useState<QuickLogResult | null>(null)
  const [quickError, setQuickError] = useState<string | null>(null)

  useEffect(() => {
    void fetchSuggestions()
  }, [])

  async function fetchSuggestions() {
    setLoadingSuggestions(true)
    try {
      const res = await fetch('/api/v1/auto-capture')
      const { data } = await res.json()
      setSuggestions((data as CaptureSuggestion[]) ?? [])
    } catch {
      // silent
    } finally {
      setLoadingSuggestions(false)
    }
  }

  async function importSuggestion(s: CaptureSuggestion) {
    setImporting(s.id)
    try {
      await fetch('/api/v1/auto-capture/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: s.title, due_date: s.due_date, due_time: s.due_time, priority: s.priority }),
      })
      setImported((prev) => new Set([...prev, s.id]))
    } catch {
      // silent
    } finally {
      setImporting(null)
    }
  }

  async function submitQuickLog() {
    if (!quickText.trim()) return
    setQuickLoading(true)
    setQuickError(null)
    setQuickResult(null)
    try {
      const res = await fetch('/api/v1/auto-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: quickText }),
      })
      const { data, error: err } = await res.json()
      if (err) throw new Error(err.message)
      setQuickResult(data as QuickLogResult)
      setQuickText('')
    } catch (e) {
      setQuickError(e instanceof Error ? e.message : 'Quick log failed')
    } finally {
      setQuickLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Quick Log */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <h2 className="text-sm font-semibold text-text-primary">Quick Log</h2>
        </div>
        <p className="text-xs text-text-tertiary">
          Type anything — tasks, habits, health data — in plain English. VitaMind will parse and save it.
        </p>
        <textarea
          value={quickText}
          onChange={(e) => setQuickText(e.target.value)}
          placeholder="e.g. Meditated for 20 mins, slept 7.5 hours, need to review Q1 report by Friday"
          rows={3}
          className="input w-full resize-none"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submitQuickLog() }}
        />
        {quickError && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{quickError}
          </div>
        )}
        {quickResult && (
          <div className="rounded-lg p-3 space-y-1" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-xs font-semibold text-green-400">Logged successfully</p>
            {quickResult.actions_taken.map((a, i) => (
              <p key={i} className="text-xs text-text-secondary flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />{a}
              </p>
            ))}
          </div>
        )}
        <button
          onClick={() => void submitQuickLog()}
          disabled={quickLoading || !quickText.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {quickLoading ? <><Spinner size="sm" /> Parsing…</> : <><Zap className="w-4 h-4" /> Log It</>}
        </button>
        <p className="text-xs text-text-tertiary text-center">Or press ⌘+Enter</p>
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Smart Suggestions</h2>
          <button
            onClick={() => void fetchSuggestions()}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Refresh
          </button>
        </div>

        {loadingSuggestions ? (
          <div className="flex justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-text-tertiary">No suggestions right now. Connect Google Calendar or log more habits.</p>
          </div>
        ) : (
          suggestions.map((s) => {
            const Icon = SOURCE_ICONS[s.source]
            const done = imported.has(s.id)
            const isImporting = importing === s.id

            return (
              <div key={s.id} className={`card p-4 flex items-center gap-4 transition-opacity ${done ? 'opacity-50' : ''}`}>
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.source === 'calendar' ? 'rgba(99,102,241,0.1)' : 'rgba(168,85,247,0.1)' }}>
                  <Icon className="w-4 h-4" style={{ color: s.source === 'calendar' ? '#6366F1' : '#A855F7' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                      {TYPE_LABELS[s.type]}
                    </span>
                    <span className="text-xs text-text-tertiary">{s.confidence}% confidence</span>
                  </div>
                  <p className="text-sm text-text-primary font-medium truncate">{s.title}</p>
                  {(s.due_date || s.description) && (
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {s.due_date ? `Due ${s.due_date}${s.due_time ? ' at ' + s.due_time : ''}` : s.description}
                    </p>
                  )}
                </div>
                {s.type === 'task' && (
                  <button
                    onClick={() => void importSuggestion(s)}
                    disabled={done || isImporting}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors disabled:opacity-40"
                  >
                    {done ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : isImporting ? <Spinner size="sm" /> : <Plus className="w-3.5 h-3.5" />}
                    {done ? 'Added' : 'Add Task'}
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
