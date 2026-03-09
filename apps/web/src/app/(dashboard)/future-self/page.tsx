import { PageHeader } from '@/components/layout/page-header'
import { FutureSelfView } from './future-self-view'

export const metadata = { title: 'Future Self' }

export default function FutureSelfPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Future Self"
        description="Write sealed messages to your future self. VitaMind forecasts what your life may look like by then based on your current habits."
      />
      <FutureSelfView />
    </div>
  )
}
