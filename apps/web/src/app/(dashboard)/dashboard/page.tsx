import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { DashboardStats } from './dashboard-stats'
import { TodayTasks } from './today-tasks'
import { HabitCheckins } from './habit-checkins'
import { GoalProgress } from './goal-progress'
import { AIInsightCard } from './ai-insight-card'
import { TaskService } from '@/features/tasks/services/task.service'
import { GoalService } from '@/features/goals/services/goal.service'
import { HabitService } from '@/features/habits/services/habit.service'

export const metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

async function getDashboardData(userId: string) {
  const [taskData, goalsResult, habitsResult] = await Promise.all([
    TaskService.getTodayAndOverdue(userId),
    GoalService.getAll(userId),
    HabitService.getAllWithStreaks(userId),
  ])
  return { taskData, goals: goalsResult.data, habitsWithStreaks: habitsResult.data }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { taskData, goals, habitsWithStreaks } = await getDashboardData(user.id)

  const firstName = user.user_metadata?.full_name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const completedHabits = habitsWithStreaks.filter((h) => h.todayLog?.status === 'completed').length
  const completedTasks = taskData.today.filter((t) => t.status === 'completed').length

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${firstName}.`}
        description={buildSummary(taskData.today.length, completedHabits, habitsWithStreaks.length)}
      />

      {/* Stats row */}
      <DashboardStats
        tasksToday={taskData.today.length}
        tasksCompleted={completedTasks}
        tasksOverdue={taskData.overdue.length}
        habitsCompleted={completedHabits}
        habitsTotal={habitsWithStreaks.length}
        goalsActive={goals.filter((g) => !g.is_completed).length}
      />

      {/* AI Insight */}
      <AIInsightCard userId={user.id} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodayTasks tasks={taskData.today} overdueTasks={taskData.overdue} />
        <div className="space-y-6">
          <HabitCheckins habits={habitsWithStreaks} />
          <GoalProgress goals={goals.slice(0, 4)} />
        </div>
      </div>
    </div>
  )
}

function buildSummary(taskCount: number, completedHabits: number, totalHabits: number): string {
  const parts: string[] = []
  if (taskCount > 0) parts.push(`${taskCount} task${taskCount !== 1 ? 's' : ''} today`)
  if (totalHabits > 0) parts.push(`${completedHabits}/${totalHabits} habits done`)
  if (parts.length === 0) return 'Your day is clear. Add some tasks to get started.'
  return parts.join(' · ')
}
