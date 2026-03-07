import { createClient } from '@/lib/supabase/server'
import { complete } from '@/features/ai/services/ai-provider'
import { getCachedInsight, saveInsight } from '@/features/ai/services/cache'
import { MomentumService } from '@/features/momentum/services/momentum.service'
import { PatternOracleService } from '@/features/pattern-oracle/services/oracle.service'
import { HealthService } from '@/features/health/services/health.service'
import { TimeFingerprintService } from '@/features/time-fingerprint/services/time-fingerprint.service'

export interface CoachingInsight {
  title: string
  observation: string   // specific data-backed pattern detected
  action: string        // concrete recommendation
  impact: string        // why this matters
  domain: 'productivity' | 'health' | 'habits' | 'goals' | 'finance' | 'mindset'
  urgency: 'high' | 'medium' | 'low'
}

export interface LifeCoachReport {
  insights: CoachingInsight[]
  summary: string          // one-line overall coaching message
  focus_this_week: string  // single highest-priority action
  generated_at: string
}

export class LifeCoachService {
  static async generateReport(userId: string, force = false): Promise<LifeCoachReport> {
    if (!force) {
      const cached = await getCachedInsight(userId, 'life_coach')
      if (cached) {
        try {
          return { ...JSON.parse(cached) as LifeCoachReport, generated_at: new Date().toISOString() }
        } catch { /* fall through to regenerate */ }
      }
    }

    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Fetch all data sources in parallel
    const [
      { data: user },
      { data: tasks },
      { data: habits },
      { data: habitLogs },
      momentumResult,
      patternsResult,
      healthResult,
      fingerprintResult,
    ] = await Promise.all([
      supabase.from('users').select('name').eq('id', userId).single(),
      supabase.from('tasks').select('status, completed_at, priority, due_date').eq('user_id', userId).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('habits').select('id, title, frequency').eq('user_id', userId).eq('is_active', true),
      supabase.from('habit_logs').select('habit_id, date, status').eq('user_id', userId).gte('date', thirtyDaysAgo.toISOString().split('T')[0]),
      MomentumService.getCurrentScore(userId).catch(() => null),
      PatternOracleService.getInsights(userId).catch(() => ({ insights: [], keystone_habit: null, has_enough_data: false })),
      HealthService.getInsights(userId, 30).catch(() => null),
      TimeFingerprintService.getProfile(userId).catch(() => ({ profile: null, has_enough_data: false })),
    ])

    const name = user?.name ?? 'there'
    const allTasks = tasks ?? []
    const completed = allTasks.filter((t) => t.status === 'completed')
    const overdue = allTasks.filter((t) => t.status === 'todo' && t.due_date && t.due_date < today)
    const completionRate = allTasks.length > 0 ? Math.round((completed.length / allTasks.length) * 100) : 0

    // Habit consistency per habit
    const habitConsistency: Record<string, number> = {}
    const daysSinceStart = 30
    for (const habit of habits ?? []) {
      const logs = (habitLogs ?? []).filter((l) => l.habit_id === habit.id && l.status === 'completed')
      habitConsistency[habit.title] = Math.round((logs.length / daysSinceStart) * 100)
    }

    const topHabits = Object.entries(habitConsistency).sort((a, b) => b[1] - a[1]).slice(0, 3)
    const bottomHabits = Object.entries(habitConsistency).sort((a, b) => a[1] - b[1]).slice(0, 3)

    // Momentum context
    const mom = momentumResult
    const patterns = patternsResult.insights.slice(0, 4)
    const fp = fingerprintResult.profile
    const health = healthResult

    const prompt = `You are VitaMind's AI Life Coach analysing ${name}'s last 30 days of life data. Generate 4–5 highly specific, data-backed coaching insights.

PRODUCTIVITY DATA (30 days):
- Task completion rate: ${completionRate}%
- Completed tasks: ${completed.length} | Overdue: ${overdue.length}
- High-priority completion: ${allTasks.filter((t) => t.priority === 'high' && t.status === 'completed').length}/${allTasks.filter((t) => t.priority === 'high').length}
${mom ? `- Momentum score: ${mom.score}/100 | Burnout risk: ${mom.burnout_risk}/100 | Task velocity: ${mom.task_velocity}/100 | Habit consistency: ${mom.habit_consistency}/100` : ''}

HABIT DATA (30 days):
- Top habits: ${topHabits.map(([h, r]) => `${h} (${r}%)`).join(', ') || 'None tracked'}
- Struggling habits: ${bottomHabits.filter(([, r]) => r < 50).map(([h, r]) => `${h} (${r}%)`).join(', ') || 'None struggling'}

${patterns.length > 0 ? `DISCOVERED PATTERNS:\n${patterns.map((p) => `- ${(p as { title: string; description: string }).title}: ${(p as { title: string; description: string }).description}`).join('\n')}` : ''}

${fp && fp.peak_hours?.length ? `PRODUCTIVITY PROFILE:\n- Peak hours: ${fp.peak_hours.map((h) => `${h}:00`).join(', ')} | Best window: ${fp.most_productive_window} | Best day: ${fp.best_day}` : ''}

${health ? `HEALTH (30 days):\n- Avg sleep: ${health.avg_sleep ?? 'N/A'}h | Sleep trend: ${health.sleep_trend}\n- Avg mood: ${health.avg_mood ?? 'N/A'}/5 | Mood trend: ${health.mood_trend}\n- Exercise: ${health.avg_exercise ?? 'N/A'} min/day | Steps: ${health.avg_steps ?? 'N/A'}/day` : ''}

Generate coaching insights. Each insight must be:
- Specific and data-driven (reference actual numbers above)
- Actionable (exact step to take)
- Honest but encouraging

Respond in JSON only (no markdown):
{"insights":[{"title":"...","observation":"...","action":"...","impact":"...","domain":"productivity","urgency":"high"}],"summary":"one encouraging sentence about overall progress","focus_this_week":"single most important action this week"}`

    const raw = await complete({ prompt, maxTokens: 800, temperature: 0.5 })
    const jsonStr = raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(jsonStr) as LifeCoachReport

    const report: LifeCoachReport = {
      insights: (parsed.insights ?? []).slice(0, 5) as CoachingInsight[],
      summary: parsed.summary ?? 'Keep going — small consistent actions compound into big results.',
      focus_this_week: parsed.focus_this_week ?? 'Focus on your highest-priority habit today.',
      generated_at: new Date().toISOString(),
    }

    await saveInsight(userId, 'life_coach', JSON.stringify(report), {}).catch(() => {})
    return report
  }
}
