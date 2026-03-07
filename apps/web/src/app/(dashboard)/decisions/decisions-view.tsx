'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Scale, AlertCircle } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { Decision, DecisionOption } from '@/features/decisions/services/decisions.service'

const RISK_COLORS = {
  low: { text: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
  medium: { text: '#EAB308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)' },
  high: { text: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
}

const CONFIDENCE_COLORS = {
  high: '#22C55E',
  medium: '#EAB308',
  low: '#EF4444',
}

export function DecisionsView() {
  const [history, setHistory] = useState<Decision[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/decisions')
      const { data } = await res.json()
      setHistory(data ?? [])
    } catch { /* silent */ } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  function addOption() {
    if (options.length < 5) setOptions((prev) => [...prev, ''])
  }

  function removeOption(i: number) {
    if (options.length > 2) setOptions((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateOption(i: number, val: string) {
    setOptions((prev) => prev.map((o, idx) => idx === i ? val : o))
  }

  async function analyze() {
    const validOptions = options.map((o) => o.trim()).filter(Boolean)
    if (!question.trim() || validOptions.length < 2) return
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), options: validOptions }),
      })
      const { data, error: err } = await res.json()
      if (err) throw new Error(err.message)
      setHistory((prev) => [data, ...prev])
      setExpandedId(data.id)
      setQuestion('')
      setOptions(['', ''])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  async function deleteDecision(id: string) {
    await fetch(`/api/v1/decisions/${id}`, { method: 'DELETE' })
    setHistory((prev) => prev.filter((d) => d.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Form */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">New Decision</h2>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What decision are you facing? (e.g. Should I change jobs? Should I start a side business?)"
          rows={2}
          className="input w-full resize-none"
        />

        <div className="space-y-2">
          <p className="text-xs text-text-tertiary">Options to compare</p>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="input flex-1 text-sm"
              />
              {options.length > 2 && (
                <button onClick={() => removeOption(i)} className="text-text-tertiary hover:text-red-400 transition-colors px-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {options.length < 5 && (
            <button onClick={addOption} className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add option
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={analyze}
          disabled={analyzing || !question.trim() || options.filter((o) => o.trim()).length < 2}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {analyzing ? <><Spinner size="sm" /> Analysing…</> : <><Scale className="w-4 h-4" /> Analyse Decision</>}
        </button>
      </div>

      {/* History */}
      {loadingHistory ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : history.length === 0 ? (
        <div className="card p-8 text-center text-sm text-text-tertiary">
          No decisions analysed yet. Use the form above to get started.
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">Decision History</p>
          {history.map((decision) => (
            <DecisionCard
              key={decision.id}
              decision={decision}
              expanded={expandedId === decision.id}
              onToggle={() => setExpandedId(expandedId === decision.id ? null : decision.id)}
              onDelete={() => deleteDecision(decision.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DecisionCard({ decision, expanded, onToggle, onDelete }: {
  decision: Decision
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const a = decision.analysis
  const date = new Date(decision.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3 cursor-pointer" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary line-clamp-2">{decision.question}</p>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-text-tertiary">{date}</p>
            {a && (
              <span className="text-xs font-medium" style={{ color: CONFIDENCE_COLORS[a.confidence] }}>
                {a.confidence.charAt(0).toUpperCase() + a.confidence.slice(1)} confidence
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1.5 text-text-tertiary hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-text-tertiary" />}
        </div>
      </div>

      {/* Expanded analysis */}
      {expanded && a && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Recommendation */}
          <div className="pt-4 rounded-lg p-3 mt-0" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Recommendation</p>
            <p className="text-sm text-text-primary leading-relaxed">{a.recommendation}</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {a.options_analysis.map((opt, i) => (
              <OptionCard key={i} opt={opt} />
            ))}
          </div>

          {/* Key considerations */}
          {a.key_considerations.length > 0 && (
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Key Considerations</p>
              <ul className="space-y-1">
                {a.key_considerations.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                    <span className="text-primary-400 mt-0.5 flex-shrink-0">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OptionCard({ opt }: { opt: DecisionOption }) {
  const risk = RISK_COLORS[opt.risk_level]

  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Option header */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-text-primary">{opt.option}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: risk.bg, border: `1px solid ${risk.border}`, color: risk.text }}>
            {opt.risk_level} risk
          </span>
          <span className="text-xs text-text-tertiary">{opt.goal_alignment}% aligned</span>
        </div>
      </div>

      {/* Goal alignment bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: `${opt.goal_alignment}%`, background: 'linear-gradient(90deg, #6366F1, #A855F7)' }} />
      </div>

      {/* Pros / Cons */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <p className="text-xs text-green-400 mb-1">Pros</p>
          <ul className="space-y-0.5">
            {opt.pros.map((p, i) => <li key={i} className="text-xs text-text-secondary">+ {p}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-xs text-red-400 mb-1">Cons</p>
          <ul className="space-y-0.5">
            {opt.cons.map((c, i) => <li key={i} className="text-xs text-text-secondary">- {c}</li>)}
          </ul>
        </div>
      </div>

      <p className="text-xs text-text-tertiary">Effort: <span className="text-text-secondary capitalize">{opt.effort_required}</span></p>
    </div>
  )
}
