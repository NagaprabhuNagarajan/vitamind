import { PageHeader } from '@/components/layout/page-header'
import { LifeSimulationView } from './life-simulation-view'

export const metadata = { title: 'Life Simulation' }

export default function LifeSimulationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Life Simulation"
        description="Simulate what your life could look like if you commit to a scenario. Powered by your real data."
      />
      <LifeSimulationView />
    </div>
  )
}
