import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { GoalService } from '@/features/goals/services/goal.service'
import { GoalList } from './goal-list'
import { GoalCreateButton } from './goal-create-button'

export const metadata = { title: 'Goals' }
export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const goalsResult = await GoalService.getAll(user.id)
  const goals = goalsResult.data
  const active = goals.filter((g) => !g.is_completed).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        description={`${active} active · ${goals.length - active} completed`}
        action={<GoalCreateButton />}
      />
      <GoalList initialGoals={goals} />
    </div>
  )
}
