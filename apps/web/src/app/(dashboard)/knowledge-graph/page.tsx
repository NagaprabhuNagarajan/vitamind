import { PageHeader } from '@/components/layout/page-header'
import { KnowledgeGraphView } from './knowledge-graph-view'

export const metadata = { title: 'Knowledge Graph' }

export default function KnowledgeGraphPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Graph"
        description="See how your habits, health, and productivity influence each other — powered by 30 days of your real data."
      />
      <KnowledgeGraphView />
    </div>
  )
}
