import type { Task, Goal, Habit, HabitLog } from '@/lib/types'
import type { MomentumSnapshot } from '@/features/momentum/types'
import type { ProductivityProfile } from '@/features/time-fingerprint/services/time-fingerprint.service'
import type { CalendarEvent } from '@/features/calendar/services/google-calendar'
import type { PatternInsight } from '@/features/pattern-oracle/types'

// Builds structured prompts for each AI use case.
// Kept concise to minimise token usage and cost.

interface UserContext {
  name: string
  date: string           // YYYY-MM-DD
  tasks: Task[]
  goals: Goal[]
  habits: Array<Habit & { streak: number; todayLog: HabitLog | null }>
  momentum?: MomentumSnapshot | null
  timeFingerprint?: ProductivityProfile | null
  calendarEvents?: CalendarEvent[]
  patterns?: PatternInsight[]
  keystoneHabit?: { title: string; impact_score: number } | null
}

// ─── Daily Planner ────────────────────────────────────────────────────────────

export function buildDailyPlanPrompt(ctx: UserContext): string {
  const taskLines = ctx.tasks
    .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
    .slice(0, 15) // cap to control tokens
    .map((t) => `- [${(t.priority ?? 'medium').toUpperCase()}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ''}`)
    .join('\n')

  const goalLines = ctx.goals
    .filter((g) => !g.is_completed)
    .slice(0, 5)
    .map((g) => `- ${g.title} (${g.progress ?? 0}% done)`)
    .join('\n')

  const habitLines = ctx.habits
    .slice(0, 8)
    .map((h) => `- ${h.title} | streak: ${h.streak} days | done today: ${h.todayLog?.status === 'completed' ? 'yes' : 'no'}`)
    .join('\n')

  // Momentum context with coaching nudge
  let momentumBlock = ''
  if (ctx.momentum) {
    const m = ctx.momentum
    momentumBlock = `\nLIFE MOMENTUM SCORE: ${m.score}/100
- Task Velocity: ${m.task_velocity}/100
- Habit Consistency: ${m.habit_consistency}/100
- Goal Trajectory: ${m.goal_trajectory}/100
- Overdue Pressure: ${m.overdue_pressure}/100
- Burnout Risk: ${m.burnout_risk}/100`

    // Proactive coaching nudge
    if (m.burnout_risk >= 60) {
      momentumBlock += `\nCOACHING ALERT: Burnout risk is elevated (${m.burnout_risk}/100). Suggest a lighter day — fewer tasks, prioritise rest and high-streak habits only.`
    } else if (m.score < 40) {
      momentumBlock += `\nCOACHING ALERT: Momentum is low (${m.score}/100). Focus on 1-2 quick wins to rebuild momentum. Suggest completing the easiest overdue task first.`
    }
  }

  // Time fingerprint context
  let fingerprintBlock = ''
  if (ctx.timeFingerprint && ctx.timeFingerprint.peak_hours?.length) {
    const fp = ctx.timeFingerprint
    fingerprintBlock = `\nPRODUCTIVITY PROFILE:
- Peak hours: ${fp.peak_hours.map((h) => `${h}:00`).join(', ')}
- Best 2-hour window: ${fp.most_productive_window}
- Best day: ${fp.best_day} | Worst day: ${fp.worst_day}
- Habit pattern: ${Math.round(fp.habit_morning_rate * 100)}% morning, ${Math.round(fp.habit_evening_rate * 100)}% evening
- Avg tasks/day: ${fp.avg_tasks_per_day}`
  }

  // Calendar events context
  let calendarBlock = ''
  if (ctx.calendarEvents && ctx.calendarEvents.length > 0) {
    const eventLines = ctx.calendarEvents.map((e) => {
      if (e.allDay) return `- [All day] ${e.summary}`
      const startTime = new Date(e.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      const endTime = new Date(e.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      return `- [${startTime} - ${endTime}] ${e.summary}`
    }).join('\n')
    calendarBlock = `\nCALENDAR (today's meetings/events):
${eventLines}
NOTE: Do NOT schedule tasks during these time blocks. Plan tasks around them.`
  }

  return `You are VitaMind, a calm and intelligent AI life assistant.

Today is ${ctx.date}. Create a focused daily plan for ${ctx.name}.

PENDING TASKS:
${taskLines || 'None'}

ACTIVE GOALS:
${goalLines || 'None'}

HABITS (today):
${habitLines || 'None'}
${momentumBlock}${fingerprintBlock}${calendarBlock}

Respond in this exact format:
## Morning Focus
[1-2 most important tasks to do first, scheduled during peak hours if known. Avoid calendar conflicts.]

## Key Priorities
[3-5 prioritised actions for the day, with brief reasoning and suggested time slots based on free windows between meetings]

## Habit Reminder
[Which habits still need to be done today, with optimal timing suggestions based on productivity profile and calendar gaps]

## Momentum Insight
[One short observation about their momentum score trend and what single action would improve it most. If burnout risk > 60, suggest a lighter day.]

Keep each section concise (1-3 lines). Be encouraging, not overwhelming. Use the productivity profile to time-optimise suggestions. Work around calendar events — never double-book.`
}

// ─── Productivity Insights ────────────────────────────────────────────────────

export function buildInsightsPrompt(ctx: UserContext): string {
  const completedTasks = ctx.tasks.filter((t) => t.status === 'completed').length
  const totalTasks = ctx.tasks.length
  const completedHabits = ctx.habits.filter((h) => h.todayLog?.status === 'completed').length
  const avgStreak = ctx.habits.length
    ? Math.round(ctx.habits.reduce((s, h) => s + h.streak, 0) / ctx.habits.length)
    : 0
  const goalProgress = ctx.goals.length
    ? Math.round(ctx.goals.reduce((s, g) => s + g.progress, 0) / ctx.goals.length)
    : 0

  let momentumLine = ''
  if (ctx.momentum) {
    momentumLine = `\n- Life Momentum Score: ${ctx.momentum.score}/100 (burnout risk: ${ctx.momentum.burnout_risk}/100)`
  }

  return `You are VitaMind. Analyse this user's productivity data and provide a brief insight.

Stats:
- Tasks: ${completedTasks}/${totalTasks} completed
- Habits today: ${completedHabits}/${ctx.habits.length} done
- Average habit streak: ${avgStreak} days
- Average goal progress: ${goalProgress}%${momentumLine}

Active goals: ${ctx.goals.filter((g) => !g.is_completed).map((g) => g.title).join(', ') || 'None'}

Provide 2-3 sentences of actionable insight. Reference the momentum score if available. Be specific, calm, and motivating.`
}

// ─── Chat Assistant ───────────────────────────────────────────────────────────

export function buildChatSystemPrompt(ctx: Omit<UserContext, 'date'>): string {
  const pendingTasks = ctx.tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
  const overdueTasks = pendingTasks.filter((t) => t.due_date && t.due_date < new Date().toISOString().split('T')[0])
  const taskSummary = pendingTasks.slice(0, 10)
    .map((t) => `${t.title} (${t.priority})`).join(', ')
  const goalSummary = ctx.goals.filter((g) => !g.is_completed).slice(0, 5)
    .map((g) => `${g.title} (${g.progress}%)`).join(', ')

  // Behavioral context for coaching
  let behavioralBlock = ''
  if (ctx.momentum) {
    const m = ctx.momentum
    behavioralBlock += `\nBehavioral data:
- Momentum score: ${m.score}/100 (task velocity: ${m.task_velocity}, habit consistency: ${m.habit_consistency}, goal trajectory: ${m.goal_trajectory})
- Burnout risk: ${m.burnout_risk}/100${m.burnout_risk >= 60 ? ' (ELEVATED — suggest lighter workload)' : ''}
- Overdue tasks: ${overdueTasks.length}`
  }

  // Habit streaks for coaching
  const missedHabits = ctx.habits.filter((h) => h.todayLog?.status !== 'completed')
  const topStreaks = ctx.habits.filter((h) => h.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 3)
  if (topStreaks.length > 0) {
    behavioralBlock += `\n- Top streaks: ${topStreaks.map((h) => `${h.title} (${h.streak} days)`).join(', ')}`
  }
  if (missedHabits.length > 0) {
    behavioralBlock += `\n- Not done today: ${missedHabits.map((h) => h.title).join(', ')}`
  }

  // Time fingerprint for scheduling advice
  let fingerprintLine = ''
  if (ctx.timeFingerprint && ctx.timeFingerprint.peak_hours?.length) {
    const fp = ctx.timeFingerprint
    fingerprintLine = `\n- Peak productivity: ${fp.peak_hours.map((h) => `${h}:00`).join(', ')} | Best window: ${fp.most_productive_window}`
  }

  // Calendar awareness
  let calendarLine = ''
  if (ctx.calendarEvents && ctx.calendarEvents.length > 0) {
    calendarLine = `\n- Today's calendar: ${ctx.calendarEvents.length} events (${ctx.calendarEvents.map((e) => e.summary).join(', ')})`
  }

  // Pattern Oracle insights for data-backed coaching
  let patternsBlock = ''
  if (ctx.patterns && ctx.patterns.length > 0) {
    const topPatterns = ctx.patterns.slice(0, 4).map((p) => `  • ${p.title}: ${p.description}`).join('\n')
    patternsBlock = `\nDiscovered behavioral patterns:\n${topPatterns}`
    if (ctx.keystoneHabit) {
      patternsBlock += `\n- Keystone habit: "${ctx.keystoneHabit.title}" (highest impact on productivity)`
    }
  }

  return `You are VitaMind, a calm and intelligent AI life coach and productivity assistant for ${ctx.name}.

Current context:
- Pending tasks: ${taskSummary || 'none'} (${overdueTasks.length} overdue)
- Active goals: ${goalSummary || 'none'}
- Active habits: ${ctx.habits.map((h) => h.title).join(', ') || 'none'}${behavioralBlock}${fingerprintLine}${calendarLine}${patternsBlock}

COACHING GUIDELINES:
- When asked about productivity, habits, or goals: reference the actual behavioral data above. Give specific, data-backed suggestions.
- When momentum is low or burnout risk is high: be empathetic. Suggest recovery actions, not more work.
- When a user has long streaks: acknowledge and reinforce them.
- When habits are missed: gently suggest optimal times based on their productivity profile.
- Always be concise, warm, and actionable. Never make up data — only reference what's in the context above.
- When discussing patterns: reference the specific discovered correlations above for credibility.
- When the keystone habit exists: encourage its consistency as the highest-leverage action.`
}
