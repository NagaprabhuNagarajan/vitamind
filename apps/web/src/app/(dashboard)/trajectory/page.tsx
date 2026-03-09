import { PageHeader } from '@/components/layout/page-header'
import { TrajectoryView } from './trajectory-view'

export const metadata = { title: 'Life Trajectory' }

export default function TrajectoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Life Trajectory"
        description="Directional velocity per life domain — see whether you are improving, declining, or stable over the last 14 days."
      />
      <TrajectoryView />
    </div>
  )
}
