import Link from 'next/link'
import type { Goal } from '@/lib/types'

interface GoalProgressProps {
  goals: Goal[]
}

export function GoalProgress({ goals }: GoalProgressProps) {
  const active = goals.filter((g) => !g.is_completed)
  if (active.length === 0) return null

  return (
    <div className="card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold text-text-primary">Goals</h2>
        <Link href="/goals" className="text-xs text-primary hover:underline font-medium">
          View all
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {active.map((goal) => (
          <li key={goal.id} className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-primary truncate max-w-[200px]">{goal.title}</span>
              <span className="text-xs text-text-tertiary font-medium ml-2">{goal.progress}%</span>
            </div>
            <div
              className="w-full h-1.5 rounded-full bg-surface-tertiary overflow-hidden"
              role="progressbar"
              aria-valuenow={goal.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${goal.title} progress`}
            >
              <div
                className="h-full rounded-full bg-secondary transition-all duration-500"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
