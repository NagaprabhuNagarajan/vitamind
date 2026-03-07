'use client'

import { useState } from 'react'
import { Sparkles, AlertCircle, ChevronRight } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { SimulationResult } from '@/features/life-simulation/services/life-simulation.service'

const EXAMPLE_SCENARIOS = [
  'Exercise 5 days a week for the next 12 months',
  'Save 20% of my income every month',
  'Sleep 8 hours every night',
  'Work on my side project for 1 hour every day',
  'Meditate for 10 minutes every morning',
]

const MONTH_LABELS: Record<number, string> = { 1: '1 Month', 3: '3 Months', 6: '6 Months', 12: '12 Months' }

export function LifeSimulationView() {
  const [scenario, setScenario] = useState('')
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function simulate(text?: string) {
    const s = (text ?? scenario).trim()
    if (!s) return
    if (text) setScenario(text)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/v1/life-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: s }),
      })
      const { data, error: err } = await res.json()
      if (err) throw new Error(err.message)
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulation failed')
    } finally {
      setLoading(false)
    }
  }

  const probColor = (p: number) => p >= 70 ? '#22C55E' : p >= 40 ? '#EAB308' : '#EF4444'

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Input */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">Describe Your Scenario</h2>
        <textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          placeholder="e.g. I start waking up at 6am and exercising every morning for the next year"
          rows={3}
          className="input w-full resize-none"
        />
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}
        <button
          onClick={() => simulate()}
          disabled={loading || !scenario.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {loading ? <><Spinner size="sm" /> Simulating…</> : <><Sparkles className="w-4 h-4" /> Run Simulation</>}
        </button>

        {/* Example scenarios */}
        <div>
          <p className="text-xs text-text-tertiary mb-2">Try an example</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_SCENARIOS.map((s) => (
              <button
                key={s}
                onClick={() => simulate(s)}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-text-tertiary">Projecting your future…</p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Header + probability */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Simulation: {result.scenario}</h3>
              <div className="flex flex-col items-end">
                <span className="text-xl font-bold" style={{ color: probColor(result.probability_of_success) }}>
                  {result.probability_of_success}%
                </span>
                <span className="text-xs text-text-tertiary">success probability</span>
              </div>
            </div>

            {/* Probability bar */}
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${result.probability_of_success}%`, background: `linear-gradient(90deg, ${probColor(result.probability_of_success)}, ${probColor(result.probability_of_success)}88)` }}
              />
            </div>

            <p className="text-sm text-text-secondary leading-relaxed">{result.summary}</p>

            <div className="rounded-lg p-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">At 12 Months</p>
              <p className="text-sm text-text-primary">{result.outcome_at_12_months}</p>
            </div>
          </div>

          {/* Timeline milestones */}
          <div className="card p-5">
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-4">Projected Timeline</p>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-3 top-2 bottom-2 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="space-y-6">
                {result.milestones.map((m, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center z-10 mt-0.5"
                      style={{ background: `rgba(${m.probability >= 70 ? '34,197,94' : m.probability >= 40 ? '234,179,8' : '239,68,68'},0.15)`, border: `1px solid rgba(${m.probability >= 70 ? '34,197,94' : m.probability >= 40 ? '234,179,8' : '239,68,68'},0.4)` }}>
                      <ChevronRight className="w-3 h-3" style={{ color: probColor(m.probability) }} />
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold" style={{ color: 'rgba(99,102,241,0.9)' }}>{MONTH_LABELS[m.month]}</span>
                        <span className="text-xs text-text-tertiary">· {m.probability}% likely</span>
                        {m.metric && <span className="text-xs font-medium text-text-primary">· {m.metric}</span>}
                      </div>
                      <p className="text-sm font-medium text-text-primary">{m.title}</p>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{m.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Risks + Enablers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4">
              <p className="text-xs text-red-400 uppercase tracking-wider mb-3">Key Risks</p>
              <ul className="space-y-2">
                {result.key_risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>{r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-4">
              <p className="text-xs text-green-400 uppercase tracking-wider mb-3">Success Enablers</p>
              <ul className="space-y-2">
                {result.key_enablers.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                    <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{e}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* First step */}
          {result.recommendation && (
            <div className="card p-4" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">First Step</p>
              <p className="text-sm text-text-primary">{result.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
