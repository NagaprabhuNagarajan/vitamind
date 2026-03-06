import type { Task, Goal, Habit, HabitLog } from '@/lib/types'
import type { MomentumSnapshot } from '@/features/momentum/types'
import type { ProductivityProfile } from '@/features/time-fingerprint/services/time-fingerprint.service'

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

  // Momentum context
  let momentumBlock = ''
  if (ctx.momentum) {
    const m = ctx.momentum
    momentumBlock = `\nLIFE MOMENTUM SCORE: ${m.score}/100
- Task Velocity: ${m.task_velocity}/100
- Habit Consistency: ${m.habit_consistency}/100
- Goal Trajectory: ${m.goal_trajectory}/100
- Overdue Pressure: ${m.overdue_pressure}/100
- Burnout Risk: ${m.burnout_risk}/100`
  }

  // Time fingerprint context
  let fingerprintBlock = ''
  if (ctx.timeFingerprint) {
    const fp = ctx.timeFingerprint
    fingerprintBlock = `\nPRODUCTIVITY PROFILE:
- Peak hours: ${fp.peak_hours.map((h) => `${h}:00`).join(', ')}
- Best 2-hour window: ${fp.most_productive_window}
- Best day: ${fp.best_day} | Worst day: ${fp.worst_day}
- Habit pattern: ${Math.round(fp.habit_morning_rate * 100)}% morning, ${Math.round(fp.habit_evening_rate * 100)}% evening
- Avg tasks/day: ${fp.avg_tasks_per_day}`
  }

  return `You are VitaMind, a calm and intelligent AI life assistant.

Today is ${ctx.date}. Create a focused daily plan for ${ctx.name}.

PENDING TASKS:
${taskLines || 'None'}

ACTIVE GOALS:
${goalLines || 'None'}

HABITS (today):
${habitLines || 'None'}
${momentumBlock}${fingerprintBlock}

Respond in this exact format:
## Morning Focus
[1-2 most important tasks to do first, scheduled during peak hours if known]

## Key Priorities
[3-5 prioritised actions for the day, with brief reasoning]

## Habit Reminder
[Which habits still need to be done today, with optimal timing suggestions if fingerprint data available]

## Momentum Insight
[One short observation about their momentum score trend and what single action would improve it most. If burnout risk > 60, suggest a lighter day.]

Keep each section concise (1-3 lines). Be encouraging, not overwhelming. Use the productivity profile to time-optimise suggestions.`
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
  const taskSummary = ctx.tasks.filter((t) => t.status !== 'completed').slice(0, 10)
    .map((t) => `${t.title} (${t.priority})`).join(', ')
  const goalSummary = ctx.goals.filter((g) => !g.is_completed).slice(0, 5)
    .map((g) => `${g.title} (${g.progress}%)`).join(', ')

  return `You are VitaMind, a calm and intelligent AI life assistant for ${ctx.name}.

Current context:
- Pending tasks: ${taskSummary || 'none'}
- Active goals: ${goalSummary || 'none'}
- Active habits: ${ctx.habits.map((h) => h.title).join(', ') || 'none'}

Answer questions about productivity, planning, and life management. Be concise, warm, and practical.
Never make up data — only reference what's in the context above.`
}
