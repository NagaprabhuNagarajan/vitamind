import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { GoalService } from '@/features/goals/services/goal.service'
import { HabitService } from '@/features/habits/services/habit.service'
import { GoalList } from './goal-list'
import { GoalCreateButton } from './goal-create-button'
import { GoalAutopilot } from './goal-autopilot'
import { CascadeSection } from './cascade-section'

export const metadata = { title: 'Goals' }
export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [goalsResult, habitsResult] = await Promise.all([
    GoalService.getAll(user.id),
    HabitService.getAll(user.id),
  ])
  const goals = goalsResult.data
  const habits = habitsResult.data
  const active = goals.filter((g) => !g.is_completed).length

  const habitOptions = habits.map(h => ({ id: h.id, title: h.title }))
  const goalOptions = goals.filter(g => !g.is_completed).map(g => ({ id: g.id, title: g.title }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        description={`${active} active · ${goals.length - active} completed`}
        action={<GoalCreateButton />}
      />
      <GoalAutopilot />
      <GoalList initialGoals={goals} />
      <CascadeSection habits={habitOptions} goals={goalOptions} />
    </div>
  )
}
