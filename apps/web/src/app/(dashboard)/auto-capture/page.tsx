import { PageHeader } from '@/components/layout/page-header'
import { AutoCaptureView } from './auto-capture-view'

export const metadata = { title: 'Auto Capture' }

export default function AutoCapturePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto Capture"
        description="Log anything in plain English, or let VitaMind surface smart suggestions from your calendar and patterns."
      />
      <AutoCaptureView />
    </div>
  )
}
