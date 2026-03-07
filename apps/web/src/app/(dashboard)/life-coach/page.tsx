import { PageHeader } from '@/components/layout/page-header'
import { LifeCoachView } from './life-coach-view'

export const metadata = { title: 'AI Life Coach' }

export default function LifeCoachPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Life Coach"
        description="Proactive, data-backed coaching insights tailored to your real patterns and behaviour."
      />
      <LifeCoachView />
    </div>
  )
}
