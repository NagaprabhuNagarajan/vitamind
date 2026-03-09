import { PageHeader } from '@/components/layout/page-header'
import { LifeReportView } from './life-report-view'

export const metadata = { title: 'Life Intelligence Report' }

export default function LifeReportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Life Intelligence Report"
        description="Your personalised AI morning briefing — momentum, burnout risk, top insight, and the single action that matters most today."
      />
      <LifeReportView />
    </div>
  )
}
