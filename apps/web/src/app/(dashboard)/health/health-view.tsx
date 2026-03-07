'use client'

import { useState, useEffect, useCallback } from 'react'
import { Moon, Footprints, Droplets, Dumbbell, Smile, TrendingUp, TrendingDown, Minus, Heart } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface HealthEntry {
  id: string
  date: string
  sleep_hours: number | null
  steps: number | null
  water_ml: number | null
  weight_kg: number | null
  exercise_minutes: number | null
  mood: number | null
  notes: string | null
}

interface HealthInsights {
  avg_sleep: number | null
  avg_steps: number | null
  avg_mood: number | null
  avg_exercise: number | null
  sleep_trend: 'improving' | 'declining' | 'stable'
  mood_trend: 'improving' | 'declining' | 'stable'
  streak_days: number
}

const MOOD_LABELS = ['', 'Awful', 'Bad', 'Okay', 'Good', 'Great']
const MOOD_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#6366f1']

function TrendIcon({ trend }: { trend: 'improving' | 'declining' | 'stable' }) {
  if (trend === 'improving') return <TrendingUp className="w-3.5 h-3.5 text-green-400" />
  if (trend === 'declining') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />
  return <Minus className="w-3.5 h-3.5 text-text-tertiary" />
}

export function HealthView() {
  const [entries, setEntries] = useState<HealthEntry[]>([])
  const [insights, setInsights] = useState<HealthInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    sleep_hours: '',
    steps: '',
    water_ml: '',
    weight_kg: '',
    exercise_minutes: '',
    mood: '',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/health?days=30')
      const json = await res.json()
      if (json.data) {
        setEntries(json.data.entries ?? [])
        setInsights(json.data.insights ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { date: form.date }
      if (form.sleep_hours) body.sleep_hours = Number(form.sleep_hours)
      if (form.steps) body.steps = Number(form.steps)
      if (form.water_ml) body.water_ml = Number(form.water_ml)
      if (form.weight_kg) body.weight_kg = Number(form.weight_kg)
      if (form.exercise_minutes) body.exercise_minutes = Number(form.exercise_minutes)
      if (form.mood) body.mood = Number(form.mood)
      if (form.notes) body.notes = form.notes

      await fetch('/api/v1/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setShowForm(false)
      setForm({ date: new Date().toISOString().split('T')[0], sleep_hours: '', steps: '', water_ml: '', weight_kg: '', exercise_minutes: '', mood: '', notes: '' })
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Heart className="w-4 h-4" /> Log today
        </button>
      </div>

      {/* Insight cards */}
      {insights && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Avg sleep', value: insights.avg_sleep ? `${insights.avg_sleep}h` : '—', icon: Moon, trend: insights.sleep_trend },
            { label: 'Avg steps', value: insights.avg_steps ? insights.avg_steps.toLocaleString('en-IN') : '—', icon: Footprints, trend: 'stable' as const },
            { label: 'Avg mood', value: insights.avg_mood ? `${insights.avg_mood}/5` : '—', icon: Smile, trend: insights.mood_trend },
            { label: 'Avg exercise', value: insights.avg_exercise ? `${insights.avg_exercise}m` : '—', icon: Dumbbell, trend: 'stable' as const },
          ].map(({ label, value, icon: Icon, trend }) => (
            <div key={label} className="card p-3 space-y-1">
              <div className="flex items-center justify-between">
                <Icon className="w-4 h-4 text-primary" />
                <TrendIcon trend={trend} />
              </div>
              <p className="text-lg font-semibold text-text-primary">{value}</p>
              <p className="text-xs text-text-tertiary">{label}</p>
            </div>
          ))}
        </div>
      )}

      {insights && (
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Tracking streak</p>
            <p className="text-xs text-text-tertiary">Consecutive days logged</p>
          </div>
          <span className="text-2xl font-bold text-primary">{insights.streak_days}</span>
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : entries.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <Heart className="w-8 h-8 mx-auto text-text-tertiary" />
          <p className="text-text-secondary text-sm">No health data yet. Log your first entry to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">{entry.date}</span>
                {entry.mood && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${MOOD_COLORS[entry.mood]}20`, color: MOOD_COLORS[entry.mood] }}>
                    {MOOD_LABELS[entry.mood]}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
                {entry.sleep_hours != null && <span className="flex items-center gap-1"><Moon className="w-3 h-3" /> {entry.sleep_hours}h sleep</span>}
                {entry.steps != null && <span className="flex items-center gap-1"><Footprints className="w-3 h-3" /> {entry.steps.toLocaleString()} steps</span>}
                {entry.water_ml != null && <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> {entry.water_ml}ml water</span>}
                {entry.exercise_minutes != null && <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" /> {entry.exercise_minutes}m exercise</span>}
                {entry.weight_kg != null && <span>{entry.weight_kg}kg</span>}
              </div>
              {entry.notes && <p className="text-xs text-text-tertiary">{entry.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Log entry modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-text-primary">Log health entry</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-text-secondary">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Sleep (hours)</label>
                  <input type="number" step="0.5" min="0" max="24" placeholder="7.5" value={form.sleep_hours} onChange={(e) => setForm((f) => ({ ...f, sleep_hours: e.target.value }))} className="input" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Steps</label>
                  <input type="number" min="0" placeholder="8000" value={form.steps} onChange={(e) => setForm((f) => ({ ...f, steps: e.target.value }))} className="input" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Water (ml)</label>
                  <input type="number" min="0" placeholder="2000" value={form.water_ml} onChange={(e) => setForm((f) => ({ ...f, water_ml: e.target.value }))} className="input" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Exercise (min)</label>
                  <input type="number" min="0" placeholder="30" value={form.exercise_minutes} onChange={(e) => setForm((f) => ({ ...f, exercise_minutes: e.target.value }))} className="input" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Weight (kg)</label>
                  <input type="number" step="0.1" min="0" placeholder="70" value={form.weight_kg} onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))} className="input" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Mood (1–5)</label>
                  <select value={form.mood} onChange={(e) => setForm((f) => ({ ...f, mood: e.target.value }))} className="input">
                    <option value="">Select</option>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} — {MOOD_LABELS[n]}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-secondary">Notes</label>
                <input type="text" placeholder="Optional notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="input" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? <Spinner size="sm" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
