import { PageHeader } from '@/components/layout/page-header'
import { SocialView } from './social-view'

export const metadata = { title: 'Social' }

export default function SocialPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Social"
        description="See what your friends are achieving today and hold each other accountable."
      />
      <SocialView />
    </div>
  )
}
