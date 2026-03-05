import { describe, it, expect } from 'vitest'
import {
  buildDailyPlanPrompt,
  buildInsightsPrompt,
  buildChatSystemPrompt,
} from '../prompt-builder'
import type { Task, Goal, Habit, HabitLog } from '@/lib/types'

type HabitWithStreak = Habit & { streak: number; todayLog: HabitLog | null }

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1', user_id: 'u1', goal_id: null, title: 'Write tests',
    description: null, priority: 'high', status: 'todo',
    due_date: '2026-03-05', completed_at: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1', user_id: 'u1', title: 'Ship MVP', description: null,
    target_date: '2026-06-01', progress: 40, is_completed: false,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeHabitWithStreak(overrides: Partial<HabitWithStreak> = {}): HabitWithStreak {
  return {
    id: 'h1', user_id: 'u1', title: 'Meditate', description: null,
    frequency: 'daily', target_days: null, reminder_time: '08:00',
    is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    streak: 5,
    todayLog: null,
    ...overrides,
  }
}

describe('buildDailyPlanPrompt', () => {
  it('includes user name and date', () => {
    const prompt = buildDailyPlanPrompt({
      name: 'Alex',
      date: '2026-03-05',
      tasks: [],
      goals: [],
      habits: [],
    })
    expect(prompt).toContain('Alex')
    expect(prompt).toContain('2026-03-05')
  })

  it('renders pending tasks with priority and due date', () => {
    const prompt = buildDailyPlanPrompt({
      name: 'Alex',
      date: '2026-03-05',
      tasks: [makeTask()],
      goals: [],
      habits: [],
    })
    expect(prompt).toContain('[HIGH] Write tests (due 2026-03-05)')
  })

  it('filters out completed and cancelled tasks', () => {
    const prompt = buildDailyPlanPrompt({
      name: 'Alex',
      date: '2026-03-05',
      tasks: [
        makeTask({ title: 'Done', status: 'completed' }),
        makeTask({ title: 'Dropped', status: 'cancelled' }),
        makeTask({ title: 'Active', status: 'todo' }),
      ],
      goals: [],
      habits: [],
    })
    expect(prompt).not.toContain('Done')
    expect(prompt).not.toContain('Dropped')
    expect(prompt).toContain('Active')
  })

  it('caps tasks at 15', () => {
    const tasks = Array.from({ length: 20 }, (_, i) =>
      makeTask({ id: `t${i}`, title: `Task ${i}` }),
    )
    const prompt = buildDailyPlanPrompt({
      name: 'Alex', date: '2026-03-05', tasks, goals: [], habits: [],
    })
    // Task 15-19 should not appear
    expect(prompt).toContain('Task 14')
    expect(prompt).not.toContain('Task 15')
  })

  it('filters out completed goals', () => {
    const prompt = buildDailyPlanPrompt({
      name: 'Alex',
      date: '2026-03-05',
      tasks: [],
      goals: [makeGoal({ is_completed: true, title: 'Finished' })],
      habits: [],
    })
    expect(prompt).not.toContain('Finished')
  })

  it('renders active goals with progress', () => {
    const prompt = buildDailyPlanPrompt({
      name: 'Alex',
      date: '2026-03-05',
      tasks: [],
      goals: [makeGoal()],
      habits: [],
    })
    expect(prompt).toContain('Ship MVP (40% done)')
  })

  it('renders habits with streak and today status', () => {
    const prompt = buildDailyPlanPrompt({
      name: 'Alex',
      date: '2026-03-05',
      tasks: [],
      goals: [],
      habits: [makeHabitWithStreak()],
    })
    expect(prompt).toContain('Meditate | streak: 5 days | done today: no')
  })

  it('shows done today: yes when log is completed', () => {
    const prompt = buildDailyPlanPrompt({
      name: 'Alex',
      date: '2026-03-05',
      tasks: [],
      goals: [],
      habits: [makeHabitWithStreak({
        todayLog: { id: 'l1', habit_id: 'h1', user_id: 'u1', date: '2026-03-05', status: 'completed', created_at: '' },
      })],
    })
    expect(prompt).toContain('done today: yes')
  })

  it('shows "None" when no data exists', () => {
    const prompt = buildDailyPlanPrompt({
      name: 'Alex', date: '2026-03-05', tasks: [], goals: [], habits: [],
    })
    expect(prompt).toContain('PENDING TASKS:\nNone')
    expect(prompt).toContain('ACTIVE GOALS:\nNone')
    expect(prompt).toContain('HABITS (today):\nNone')
  })

  it('includes the expected output format instructions', () => {
    const prompt = buildDailyPlanPrompt({
      name: 'Alex', date: '2026-03-05', tasks: [], goals: [], habits: [],
    })
    expect(prompt).toContain('## Morning Focus')
    expect(prompt).toContain('## Key Priorities')
    expect(prompt).toContain('## Habit Reminder')
    expect(prompt).toContain('## One Insight')
  })
})

describe('buildInsightsPrompt', () => {
  it('calculates correct stats', () => {
    const prompt = buildInsightsPrompt({
      name: 'Alex',
      date: '2026-03-05',
      tasks: [
        makeTask({ status: 'completed' }),
        makeTask({ status: 'todo', id: 't2' }),
        makeTask({ status: 'in_progress', id: 't3' }),
      ],
      goals: [makeGoal({ progress: 60 }), makeGoal({ id: 'g2', progress: 40 })],
      habits: [
        makeHabitWithStreak({ streak: 10, todayLog: { id: 'l1', habit_id: 'h1', user_id: 'u1', date: '2026-03-05', status: 'completed', created_at: '' } }),
        makeHabitWithStreak({ id: 'h2', streak: 4, todayLog: null }),
      ],
    })
    expect(prompt).toContain('Tasks: 1/3 completed')
    expect(prompt).toContain('Habits today: 1/2 done')
    expect(prompt).toContain('Average habit streak: 7 days')
    expect(prompt).toContain('Average goal progress: 50%')
  })

  it('handles zero habits and goals gracefully', () => {
    const prompt = buildInsightsPrompt({
      name: 'Alex', date: '2026-03-05', tasks: [], goals: [], habits: [],
    })
    expect(prompt).toContain('Average habit streak: 0 days')
    expect(prompt).toContain('Average goal progress: 0%')
    expect(prompt).toContain('Active goals: None')
  })
})

describe('buildChatSystemPrompt', () => {
  it('includes user name and context', () => {
    const prompt = buildChatSystemPrompt({
      name: 'Alex',
      tasks: [makeTask()],
      goals: [makeGoal()],
      habits: [makeHabitWithStreak()],
    })
    expect(prompt).toContain('AI life assistant for Alex')
    expect(prompt).toContain('Write tests (high)')
    expect(prompt).toContain('Ship MVP (40%)')
    expect(prompt).toContain('Meditate')
  })

  it('filters out completed tasks', () => {
    const prompt = buildChatSystemPrompt({
      name: 'Alex',
      tasks: [makeTask({ status: 'completed', title: 'Done' })],
      goals: [],
      habits: [],
    })
    expect(prompt).not.toContain('Done')
    expect(prompt).toContain('Pending tasks: none')
  })

  it('shows "none" for empty context', () => {
    const prompt = buildChatSystemPrompt({
      name: 'Alex', tasks: [], goals: [], habits: [],
    })
    expect(prompt).toContain('Pending tasks: none')
    expect(prompt).toContain('Active goals: none')
    expect(prompt).toContain('Active habits: none')
  })

  it('caps tasks at 10', () => {
    const tasks = Array.from({ length: 15 }, (_, i) =>
      makeTask({ id: `t${i}`, title: `Task ${i}` }),
    )
    const prompt = buildChatSystemPrompt({ name: 'Alex', tasks, goals: [], habits: [] })
    expect(prompt).toContain('Task 9')
    expect(prompt).not.toContain('Task 10')
  })
})
