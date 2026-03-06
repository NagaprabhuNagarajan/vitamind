'use client'

import { useState, useEffect } from 'react'
import { Link2, Plus, X, Sparkles, Loader2 } from 'lucide-react'

interface HabitGoalLink {
  id: string
  habit_id: string
  goal_id: string
  impact_weight: number
}

interface LinkSuggestion {
  habit_id: string
  goal_id: string
  reason: string
}

interface CascadeData {
  links: HabitGoalLink[]
  suggestions: { habit_title: string; missed_days: number; affected_goals: { goal_title: string; estimated_delay_days: number }[]; suggestion: string }[]
}

interface HabitOption {
  id: string
  title: string
}

interface GoalOption {
  id: string
  title: string
}

export function CascadeSection({ habits, goals }: { habits: HabitOption[]; goals: GoalOption[] }) {
  const [data, setData] = useState<CascadeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [suggesting, setSuggesting] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<LinkSuggestion[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [selectedHabit, setSelectedHabit] = useState('')
  const [selectedGoal, setSelectedGoal] = useState('')
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    fetchCascade()
  }, [])

  async function fetchCascade() {
    try {
      const res = await fetch('/api/v1/cascade')
      const { data } = await res.json()
      setData(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function handleLink(habitId: string, goalId: string) {
    setLinking(true)
    try {
      await fetch('/api/v1/cascade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link', habit_id: habitId, goal_id: goalId, impact_weight: 0.5 }),
      })
      await fetchCascade()
      setShowAdd(false)
      setSelectedHabit('')
      setSelectedGoal('')
      setAiSuggestions(prev => prev.filter(s => !(s.habit_id === habitId && s.goal_id === goalId)))
    } finally {
      setLinking(false)
    }
  }

  async function handleUnlink(linkId: string) {
    await fetch('/api/v1/cascade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unlink', link_id: linkId }),
    })
    await fetchCascade()
  }

  async function handleSuggest() {
    setSuggesting(true)
    try {
      const res = await fetch('/api/v1/cascade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest-links' }),
      })
      const { data } = await res.json()
      setAiSuggestions(data ?? [])
    } finally {
      setSuggesting(false)
    }
  }

  const habitMap = new Map(habits.map(h => [h.id, h.title]))
  const goalMap = new Map(goals.map(g => [g.id, g.title]))

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-12 rounded-lg bg-surface-tertiary/30" />
      </div>
    )
  }

  const links = data?.links ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-text-primary">Cascade Intelligence</h2>
          <span className="text-[10px] text-text-tertiary">({links.length} links)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSuggest}
            disabled={suggesting}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-text-secondary transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {suggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI Suggest
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-text-secondary transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Plus className="w-3 h-3" />
            Link
          </button>
        </div>
      </div>

      {/* Manual link form */}
      {showAdd && (
        <div className="card p-4 space-y-3" style={{ border: '1px solid rgba(99,102,241,0.15)' }}>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={selectedHabit}
              onChange={e => setSelectedHabit(e.target.value)}
              className="rounded-lg px-3 py-2 text-xs bg-surface-tertiary/30 text-text-primary border border-white/10"
            >
              <option value="">Select habit...</option>
              {habits.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}
            </select>
            <select
              value={selectedGoal}
              onChange={e => setSelectedGoal(e.target.value)}
              className="rounded-lg px-3 py-2 text-xs bg-surface-tertiary/30 text-text-primary border border-white/10"
            >
              <option value="">Select goal...</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
          <button
            onClick={() => handleLink(selectedHabit, selectedGoal)}
            disabled={!selectedHabit || !selectedGoal || linking}
            className="btn-primary text-xs px-4 py-1.5"
          >
            {linking ? 'Linking...' : 'Create Link'}
          </button>
        </div>
      )}

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="space-y-2">
          {aiSuggestions.map((s, i) => (
            <div key={i} className="card p-3 flex items-center justify-between" style={{
              background: 'rgba(99,102,241,0.04)',
              border: '1px solid rgba(99,102,241,0.12)',
            }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-text-primary">
                  <span className="truncate">{habitMap.get(s.habit_id) ?? '?'}</span>
                  <span className="text-text-tertiary">→</span>
                  <span className="truncate">{goalMap.get(s.goal_id) ?? '?'}</span>
                </div>
                <p className="text-[10px] text-text-tertiary mt-0.5">{s.reason}</p>
              </div>
              <button
                onClick={() => handleLink(s.habit_id, s.goal_id)}
                className="ml-2 px-2 py-1 rounded text-[10px] font-medium text-indigo-400 hover:bg-indigo-400/10 transition-colors"
              >
                Accept
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Existing links */}
      {links.length > 0 ? (
        <div className="space-y-2">
          {links.map(link => (
            <div key={link.id} className="card p-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-text-primary">
                <span className="truncate">{habitMap.get(link.habit_id) ?? 'Unknown habit'}</span>
                <span className="text-text-tertiary">→</span>
                <span className="truncate">{goalMap.get(link.goal_id) ?? 'Unknown goal'}</span>
              </div>
              <button
                onClick={() => handleUnlink(link.id)}
                className="text-text-tertiary hover:text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-6 text-center text-text-tertiary text-xs">
          No habit-goal links yet. Link habits to goals to track cascade effects when habits are missed.
        </div>
      )}
    </div>
  )
}
