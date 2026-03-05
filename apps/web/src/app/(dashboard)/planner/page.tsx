import { PageHeader } from '@/components/layout/page-header'
import { DailyPlanView } from './daily-plan-view'

export const metadata = { title: 'AI Planner' }

export default function PlannerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Daily Planner"
        description="Your personalised plan, generated from your tasks, goals, and habits."
      />
      <DailyPlanView />
    </div>
  )
}
