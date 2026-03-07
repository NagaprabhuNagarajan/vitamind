import { createClient } from '@/lib/supabase/server'
import type { MomentumSnapshot } from '@/features/momentum/types'

export type TrendDirection = 'improving' | 'declining' | 'stable'

export interface WeekSummary {
  week_start: string         // YYYY-MM-DD (Monday of that week)
  week_label: string         // "Mar 3 – Mar 9"
  avg_score: number
  avg_task_velocity: number
  avg_habit_consistency: number
  avg_goal_trajectory: number
  avg_overdue_pressure: number
  avg_burnout_risk: number
  days_recorded: number
}

export interface ComponentTrend {
  direction: TrendDirection
  delta: number              // second-half avg minus first-half avg
}

export interface BehavioralTrendsResult {
  weeks: WeekSummary[]
  overall_trend: TrendDirection
  overall_delta: number
  component_trends: {
    score: ComponentTrend
    task_velocity: ComponentTrend
    habit_consistency: ComponentTrend
    goal_trajectory: ComponentTrend
    burnout_risk: ComponentTrend   // direction is already inverted (rising burnout = declining)
  }
  best_week: WeekSummary | null
  worst_week: WeekSummary | null
  has_enough_data: boolean
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function weekLabel(mondayStr: string): string {
  const start = new Date(mondayStr + 'T00:00:00')
  const end = new Date(mondayStr + 'T00:00:00')
  end.setDate(end.getDate() + 6)
  return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}`
}

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day   // Sunday = shift back 6, else shift to Monday
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function avgField(snaps: MomentumSnapshot[], key: keyof MomentumSnapshot): number {
  const vals = snaps.map((s) => (s[key] as number) ?? 0)
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

function computeComponentTrend(
  weeks: WeekSummary[],
  field: keyof Pick<WeekSummary, 'avg_score' | 'avg_task_velocity' | 'avg_habit_consistency' | 'avg_goal_trajectory' | 'avg_burnout_risk'>,
  invertDirection = false,
): ComponentTrend {
  if (weeks.length < 2) return { direction: 'stable', delta: 0 }
  const mid = Math.ceil(weeks.length / 2)
  const firstHalf = weeks.slice(0, mid)
  const secondHalf = weeks.slice(mid)
  if (secondHalf.length === 0) return { direction: 'stable', delta: 0 }
  const avgFirst = firstHalf.reduce((s, w) => s + (w[field] as number), 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((s, w) => s + (w[field] as number), 0) / secondHalf.length
  const delta = Math.round(avgSecond - avgFirst)
  let direction: TrendDirection = delta > 3 ? 'improving' : delta < -3 ? 'declining' : 'stable'
  if (invertDirection && direction !== 'stable') {
    direction = direction === 'improving' ? 'declining' : 'improving'
  }
  return { direction, delta }
}

export class BehavioralTrendsService {
  static async getAnalysis(userId: string): Promise<BehavioralTrendsResult> {
    const supabase = await createClient()

    const since = new Date()
    since.setDate(since.getDate() - 90)

    const { data } = await supabase
      .from('momentum_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: true })

    const snapshots = (data ?? []) as MomentumSnapshot[]

    const empty: BehavioralTrendsResult = {
      weeks: [],
      overall_trend: 'stable',
      overall_delta: 0,
      component_trends: {
        score: { direction: 'stable', delta: 0 },
        task_velocity: { direction: 'stable', delta: 0 },
        habit_consistency: { direction: 'stable', delta: 0 },
        goal_trajectory: { direction: 'stable', delta: 0 },
        burnout_risk: { direction: 'stable', delta: 0 },
      },
      best_week: null,
      worst_week: null,
      has_enough_data: false,
    }

    if (snapshots.length < 7) return empty

    // Group snapshots by ISO week (Monday as key)
    const weekMap = new Map<string, MomentumSnapshot[]>()
    for (const snap of snapshots) {
      const key = mondayOf(snap.date)
      if (!weekMap.has(key)) weekMap.set(key, [])
      weekMap.get(key)!.push(snap)
    }

    const weeks: WeekSummary[] = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, snaps]) => ({
        week_start: weekStart,
        week_label: weekLabel(weekStart),
        avg_score: avgField(snaps, 'score'),
        avg_task_velocity: avgField(snaps, 'task_velocity'),
        avg_habit_consistency: avgField(snaps, 'habit_consistency'),
        avg_goal_trajectory: avgField(snaps, 'goal_trajectory'),
        avg_overdue_pressure: avgField(snaps, 'overdue_pressure'),
        avg_burnout_risk: avgField(snaps, 'burnout_risk'),
        days_recorded: snaps.length,
      }))

    if (weeks.length < 2) return { ...empty, weeks, has_enough_data: false }

    const scoreTrend = computeComponentTrend(weeks, 'avg_score')
    const best = weeks.reduce((b, w) => w.avg_score > b.avg_score ? w : b, weeks[0])
    const worst = weeks.reduce((b, w) => w.avg_score < b.avg_score ? w : b, weeks[0])

    return {
      weeks,
      overall_trend: scoreTrend.direction,
      overall_delta: scoreTrend.delta,
      component_trends: {
        score: scoreTrend,
        task_velocity: computeComponentTrend(weeks, 'avg_task_velocity'),
        habit_consistency: computeComponentTrend(weeks, 'avg_habit_consistency'),
        goal_trajectory: computeComponentTrend(weeks, 'avg_goal_trajectory'),
        burnout_risk: computeComponentTrend(weeks, 'avg_burnout_risk', true), // higher burnout = declining
      },
      best_week: best,
      worst_week: worst,
      has_enough_data: true,
    }
  }
}
