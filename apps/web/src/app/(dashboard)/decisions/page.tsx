import { PageHeader } from '@/components/layout/page-header'
import { DecisionsView } from './decisions-view'

export const metadata = { title: 'Decision Engine' }

export default function DecisionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Decision Engine"
        description="Get AI-powered analysis for personal and professional decisions, aligned with your goals and current momentum."
      />
      <DecisionsView />
    </div>
  )
}
