import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { TaskService } from '@/features/tasks/services/task.service'
import { GoalService } from '@/features/goals/services/goal.service'
import { TaskList } from './task-list'
import { TaskCreateButton } from './task-create-button'

export const metadata = { title: 'Tasks' }
export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [tasksResult, goalsResult] = await Promise.all([
    TaskService.getAll(user.id),
    GoalService.getAll(user.id),
  ])
  const tasks = tasksResult.data
  const goals = goalsResult.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description={`${tasks.filter((t) => t.status !== 'completed').length} remaining`}
        action={<TaskCreateButton goals={goals} />}
      />
      <TaskList initialTasks={tasks} goals={goals} />
    </div>
  )
}
