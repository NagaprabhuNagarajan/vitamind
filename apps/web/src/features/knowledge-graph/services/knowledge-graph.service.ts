import { createAdminClient } from '@/lib/supabase/admin'
import { complete } from '@/features/ai/services/ai-provider'
import { getCachedInsight, saveInsight } from '@/features/ai/services/cache'

export interface GraphNode {
  id: string
  label: string
  type: 'habit' | 'health' | 'productivity' | 'goal' | 'outcome'
  strength: number   // 0–100 (how active/strong this node is)
  description?: string
}

export interface GraphEdge {
  from: string       // node id
  to: string         // node id
  label: string      // e.g. "+34% tasks"
  strength: number   // 0–100 (line weight / influence magnitude)
  direction: 'positive' | 'negative' | 'neutral'
}

export interface KnowledgeGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  keystone_node: string | null   // node id of highest-influence node
  summary: string
  has_enough_data: boolean
  computed_at: string
}

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  if (!valid.length) return null
  return Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * 10) / 10
}

function trend(values: number[]): 'improving' | 'declining' | 'stable' {
  if (values.length < 4) return 'stable'
  const half = Math.floor(values.length / 2)
  const first = values.slice(0, half).reduce((s, v) => s + v, 0) / half
  const second = values.slice(half).reduce((s, v) => s + v, 0) / (values.length - half)
  const delta = second - first
  if (delta > 0.3) return 'improving'
  if (delta < -0.3) return 'declining'
  return 'stable'
}

export class KnowledgeGraphService {
  static async getGraph(userId: string, force = false): Promise<KnowledgeGraph> {
    if (!force) {
      const cached = await getCachedInsight(userId, 'knowledge_graph').catch(() => null)
      if (cached) {
        try { return JSON.parse(cached) as KnowledgeGraph } catch { /* regenerate */ }
      }
    }

    const supabase = createAdminClient()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sinceStr = thirtyDaysAgo.toISOString()
    const sinceDate = thirtyDaysAgo.toISOString().split('T')[0]

    const [
      { data: habits },
      { data: habitLogs },
      { data: tasks },
      { data: goals },
      { data: healthEntries },
    ] = await Promise.all([
      supabase.from('habits').select('id, title').eq('user_id', userId).eq('is_active', true),
      supabase.from('habit_logs').select('habit_id, date, status').eq('user_id', userId).gte('date', sinceDate),
      supabase.from('tasks').select('status, completed_at, priority').eq('user_id', userId).gte('created_at', sinceStr),
      supabase.from('goals').select('title, progress, domain').eq('user_id', userId).eq('is_completed', false).limit(5),
      supabase.from('health_entries').select('sleep_hours, mood, exercise_minutes, date').eq('user_id', userId).gte('date', sinceDate).order('date', { ascending: true }),
    ])

    // Compute productivity stats
    const allTasks = tasks ?? []
    const completedTasks = allTasks.filter((t: { status: string }) => t.status === 'completed')
    const completionRate = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0

    // Compute habit-task correlations: avg tasks completed on habit-completion days vs. non-habit days
    const dateTaskCount = new Map<string, number>()
    for (const t of completedTasks) {
      const tAny = t as { completed_at?: string }
      if (!tAny.completed_at) continue
      const d = new Date(tAny.completed_at).toISOString().split('T')[0]
      dateTaskCount.set(d, (dateTaskCount.get(d) ?? 0) + 1)
    }

    const habitCorrelations: Array<{ title: string; rate: number; diff: number }> = []

    for (const habit of habits ?? []) {
      const hAny = habit as { id: string; title: string }
      const completedDates = (habitLogs ?? [])
        .filter((l: { habit_id: string; status: string }) => l.habit_id === hAny.id && l.status === 'completed')
        .map((l: { date: string }) => l.date)
      if (completedDates.length < 5) continue

      const avgWith = completedDates.reduce((s: number, d: string) => s + (dateTaskCount.get(d) ?? 0), 0) / completedDates.length
      const daysWithout = [...dateTaskCount.keys()].filter((d) => !completedDates.includes(d))
      const avgWithout = daysWithout.length > 0
        ? daysWithout.reduce((s, d) => s + (dateTaskCount.get(d) ?? 0), 0) / daysWithout.length
        : 0

      habitCorrelations.push({
        title: hAny.title,
        rate: Math.round((completedDates.length / 30) * 100),
        diff: avgWith - avgWithout,
      })
    }

    // Compute health averages directly
    const entries = healthEntries ?? []
    const sleepValues = entries.map((e: { sleep_hours?: number | null }) => e.sleep_hours ?? null)
    const moodValues = entries.map((e: { mood?: number | null }) => e.mood ?? null)
    const exerciseValues = entries.map((e: { exercise_minutes?: number | null }) => e.exercise_minutes ?? null)
    const avgSleep = avg(sleepValues)
    const avgMood = avg(moodValues)
    const avgExercise = avg(exerciseValues)
    const sleepTrend = trend(sleepValues.filter((v): v is number => v !== null))
    const moodTrend = trend(moodValues.filter((v): v is number => v !== null))

    // Build prompt context
    const habitSummary = habitCorrelations.map((h) =>
      `${h.title}: ${h.rate}% completion rate, ${h.diff > 0 ? '+' : ''}${h.diff.toFixed(1)} tasks on habit days vs non-habit days`
    ).join('\n') || 'No habit data with enough history (need 5+ completions per habit)'

    const goalSummary = (goals ?? []).map((g) => {
      const gAny = g as { title: string; progress: number; domain?: string }
      return `${gAny.title} (${gAny.progress ?? 0}% done, domain: ${gAny.domain ?? 'personal'})`
    }).join('; ') || 'No active goals'

    const healthSummary = entries.length > 0
      ? `Sleep: ${avgSleep ?? 'N/A'}h (${sleepTrend} trend) | Mood: ${avgMood ?? 'N/A'}/5 (${moodTrend} trend) | Exercise: ${avgExercise ?? 'N/A'} min/day`
      : 'No health data yet'

    const prompt = `You are VitaMind's Knowledge Graph Engine. Analyse this user's life data and identify the key influence relationships between their habits, health, and outcomes.

HABITS (30-day data):
${habitSummary}

HEALTH (30-day avg):
${healthSummary}

GOALS:
${goalSummary}

PRODUCTIVITY:
Task completion rate: ${completionRate}% (${completedTasks.length} tasks completed in 30 days)

Generate a concise knowledge graph (max 6 nodes, max 8 edges) showing the key influence relationships. Even with minimal data, create a plausible baseline graph using general life-science principles.

YOU MUST respond with ONLY valid JSON. No explanation, no markdown, no text before or after. Start your response with { and end with }.

{"nodes":[{"id":"n1","label":"Label","type":"habit","strength":75,"description":"brief"},{"id":"n2","label":"Label","type":"productivity","strength":60}],"edges":[{"from":"n1","to":"n2","label":"+20% tasks","strength":65,"direction":"positive"}],"keystone_node":"n1","summary":"2-3 sentence insight."}`

    const raw = await complete({ prompt, maxTokens: 1200, temperature: 0.2 })

    let parsed: Omit<KnowledgeGraph, 'has_enough_data' | 'computed_at'>
    try {
      // Strip markdown fences, then extract the outermost JSON object
      const stripped = raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()
      const firstBrace = stripped.indexOf('{')
      const lastBrace = stripped.lastIndexOf('}')
      const jsonStr = firstBrace !== -1 && lastBrace > firstBrace
        ? stripped.slice(firstBrace, lastBrace + 1)
        : stripped
      parsed = JSON.parse(jsonStr) as typeof parsed
    } catch {
      console.error('[knowledge-graph] raw AI response:', raw.slice(0, 500))
      throw new Error('AI returned invalid JSON for knowledge graph')
    }

    const graph: KnowledgeGraph = {
      nodes: (parsed.nodes ?? []).slice(0, 10) as GraphNode[],
      edges: (parsed.edges ?? []).slice(0, 12) as GraphEdge[],
      keystone_node: parsed.keystone_node ?? null,
      summary: parsed.summary ?? '',
      has_enough_data: true,
      computed_at: new Date().toISOString(),
    }

    await saveInsight(userId, 'knowledge_graph', JSON.stringify(graph)).catch(() => {})
    return graph
  }

  static notEnoughData(): KnowledgeGraph {
    return {
      nodes: [],
      edges: [],
      keystone_node: null,
      summary: 'Not enough data yet. Keep logging habits, tasks, and health entries for at least 2 weeks to see your knowledge graph.',
      has_enough_data: false,
      computed_at: new Date().toISOString(),
    }
  }
}
