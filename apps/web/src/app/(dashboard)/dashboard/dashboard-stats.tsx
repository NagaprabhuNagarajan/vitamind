import { CheckSquare, Repeat2, Target, AlertCircle } from 'lucide-react'

interface DashboardStatsProps {
  tasksToday: number
  tasksCompleted: number
  tasksOverdue: number
  habitsCompleted: number
  habitsTotal: number
  goalsActive: number
}

export function DashboardStats({
  tasksToday,
  tasksCompleted,
  tasksOverdue,
  habitsCompleted,
  habitsTotal,
  goalsActive,
}: DashboardStatsProps) {
  const stats = [
    {
      label: 'Tasks today',
      value: `${tasksCompleted}/${tasksToday}`,
      sub: tasksOverdue > 0 ? `${tasksOverdue} overdue` : 'on track',
      icon: CheckSquare,
      gradient: 'linear-gradient(135deg, #6366F1, #818CF8)',
      glow: 'rgba(99,102,241,0.3)',
      iconBg: 'rgba(99,102,241,0.15)',
    },
    {
      label: 'Habits',
      value: `${habitsCompleted}/${habitsTotal}`,
      sub: habitsTotal > 0 ? `${Math.round((habitsCompleted / habitsTotal) * 100)}% done` : 'none yet',
      icon: Repeat2,
      gradient: 'linear-gradient(135deg, #A855F7, #C084FC)',
      glow: 'rgba(168,85,247,0.3)',
      iconBg: 'rgba(168,85,247,0.15)',
    },
    {
      label: 'Active goals',
      value: goalsActive,
      sub: 'in progress',
      icon: Target,
      gradient: 'linear-gradient(135deg, #06B6D4, #22D3EE)',
      glow: 'rgba(6,182,212,0.3)',
      iconBg: 'rgba(6,182,212,0.15)',
    },
    {
      label: 'Overdue',
      value: tasksOverdue,
      sub: tasksOverdue > 0 ? 'needs attention' : 'all clear',
      icon: AlertCircle,
      gradient: tasksOverdue > 0
        ? 'linear-gradient(135deg, #F97316, #FB923C)'
        : 'linear-gradient(135deg, #10B981, #34D399)',
      glow: tasksOverdue > 0 ? 'rgba(249,115,22,0.3)' : 'rgba(16,185,129,0.3)',
      iconBg: tasksOverdue > 0 ? 'rgba(249,115,22,0.12)' : 'rgba(16,185,129,0.12)',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, sub, icon: Icon, gradient, glow, iconBg }, i) => (
        <div
          key={label}
          className="card p-4 group cursor-default animate-fade-in"
          style={{ animationDelay: `${i * 0.07}s` }}
        >
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-widest">{label}</span>
            <div className="icon-box w-8 h-8 rounded-lg" style={{ background: iconBg }}>
              <Icon className="w-4 h-4" style={{ color: 'transparent', stroke: 'url(#grad-' + i + ')' }} />
              {/* Fallback colored icon */}
              <Icon className="w-4 h-4 opacity-0 absolute" />
            </div>
          </div>

          {/* Value */}
          <p className="text-2xl font-bold tracking-tight mb-0.5" style={{
            background: gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {value}
          </p>
          <p className="text-xs text-text-tertiary">{sub}</p>

          {/* Bottom glow line */}
          <div className="absolute bottom-0 left-4 right-4 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
            background: `linear-gradient(90deg, transparent, ${glow}, transparent)`,
          }} />
        </div>
      ))}
    </div>
  )
}
