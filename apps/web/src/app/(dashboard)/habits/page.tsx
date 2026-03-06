import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { HabitService } from '@/features/habits/services/habit.service'
import { HabitGrid } from './habit-grid'
import { HabitCreateButton } from './habit-create-button'
import { HabitStacks } from './habit-stacks'

export const metadata = { title: 'Habits' }
export const dynamic = 'force-dynamic'

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const habitsResult = await HabitService.getAllWithStreaks(user.id)
  const habits = habitsResult.data
  const done = habits.filter((h) => h.todayLog?.status === 'completed').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Habits"
        description={`${done}/${habits.length} done today`}
        action={<HabitCreateButton />}
      />
      <HabitStacks />
      <HabitGrid initialHabits={habits} />
    </div>
  )
}
