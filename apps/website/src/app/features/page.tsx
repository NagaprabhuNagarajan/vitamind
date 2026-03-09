import {
  Navigation,
  Activity,
  AlertTriangle,
  Brain,
  Clock,
  MessageCircle,
} from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { GlassCard } from '@/components/ui/glass-card'

const FEATURES = [
  {
    icon: Navigation,
    title: 'AI Life GPS',
    color: 'text-primary-400',
    bg: 'bg-primary/10',
    bullets: [
      'Track directional velocity across every life domain',
      'See whether Health, Career, Growth, and Relationships are improving or declining',
      'Get AI-generated course corrections when you drift off track',
      'Weekly trajectory reports with actionable insights',
    ],
    mockTitle: 'Domain Velocity',
    mockBars: [
      { label: 'Health', value: 72, color: '#22C55E' },
      { label: 'Career', value: 85, color: '#6366F1' },
      { label: 'Growth', value: 68, color: '#A855F7' },
      { label: 'Social', value: 55, color: '#22D3EE' },
    ],
  },
  {
    icon: Activity,
    title: 'Momentum Score',
    color: 'text-secondary-400',
    bg: 'bg-secondary/10',
    bullets: [
      'A single number that tells you if your life is improving',
      'Calculated from habit completion, goal progress, and task velocity',
      'Track 7-day, 30-day, and 90-day trends at a glance',
      'Understand what drives your momentum up or down',
    ],
    mockTitle: 'Momentum Trend',
    mockScore: 87,
    mockDelta: '+12',
  },
  {
    icon: AlertTriangle,
    title: 'Burnout Radar',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    bullets: [
      'Early warning system for physical and mental burnout',
      'Monitors habit drops, task avoidance, and energy patterns',
      'Proactive alerts before burnout becomes critical',
      'Personalized recovery recommendations',
    ],
    mockTitle: 'Burnout Risk',
    mockLevel: 'Low',
    mockLevelColor: 'text-green-400',
  },
  {
    icon: Brain,
    title: 'Pattern Oracle',
    color: 'text-accent-400',
    bg: 'bg-accent/10',
    bullets: [
      'Discover hidden correlations between habits and outcomes',
      'AI identifies patterns humans cannot see in their own data',
      'Understand which habits impact your productivity most',
      'Get evidence-based suggestions for behavior change',
    ],
    mockTitle: 'Pattern Insight',
    mockInsight: 'Morning workouts correlate with 34% higher afternoon productivity.',
  },
  {
    icon: Clock,
    title: 'Life Timeline',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    bullets: [
      'A searchable chronological record of your life events',
      'Track achievements, milestones, and habit streaks',
      'Filter by domain, date range, or event type',
      'Export your life data at any time',
    ],
    mockTitle: 'Recent Events',
    mockEvents: [
      { date: 'Mar 9', label: '30-day workout streak' },
      { date: 'Mar 7', label: 'Completed Q1 goals review' },
      { date: 'Mar 4', label: 'Momentum all-time high: 92' },
    ],
  },
  {
    icon: MessageCircle,
    title: 'AI Life Coach',
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    bullets: [
      'Daily personalized coaching based on your behavioral data',
      'Ask questions about your patterns, trends, and trajectory',
      'Get context-aware advice that improves as it learns about you',
      'Natural conversation interface — like texting a wise friend',
    ],
    mockTitle: 'AI Coach',
    mockMessage: 'Based on your patterns this week, I recommend focusing on sleep quality. Your productivity drops 23% after nights with less than 7 hours.',
  },
]

function FeatureMock({ feature }: { feature: (typeof FEATURES)[number] }) {
  if (feature.mockBars) {
    return (
      <GlassCard>
        <p className="text-xs text-gray-500 mb-4">{feature.mockTitle}</p>
        <div className="space-y-3">
          {feature.mockBars.map((bar) => (
            <div key={bar.label} className="flex items-center gap-3 text-sm">
              <span className="w-14 text-gray-400 text-xs">{bar.label}</span>
              <div className="flex-1 h-2 rounded-full bg-white/5">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${bar.value}%`, background: bar.color }}
                />
              </div>
              <span className="w-8 text-right text-gray-300 text-xs">{bar.value}%</span>
            </div>
          ))}
        </div>
      </GlassCard>
    )
  }

  if (feature.mockScore !== undefined) {
    return (
      <GlassCard>
        <p className="text-xs text-gray-500 mb-4">{feature.mockTitle}</p>
        <div className="flex items-end gap-2">
          <span className="text-5xl font-bold text-white">{feature.mockScore}</span>
          <span className="text-sm text-green-400 mb-2">{feature.mockDelta}</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">7-day momentum score</p>
      </GlassCard>
    )
  }

  if (feature.mockLevel) {
    return (
      <GlassCard>
        <p className="text-xs text-gray-500 mb-4">{feature.mockTitle}</p>
        <p className={`text-3xl font-bold ${feature.mockLevelColor}`}>{feature.mockLevel}</p>
        <p className="text-xs text-gray-500 mt-2">All signals within healthy range</p>
      </GlassCard>
    )
  }

  if (feature.mockInsight) {
    return (
      <GlassCard>
        <p className="text-xs text-gray-500 mb-4">{feature.mockTitle}</p>
        <p className="text-sm text-gray-300 leading-relaxed">{feature.mockInsight}</p>
      </GlassCard>
    )
  }

  if (feature.mockEvents) {
    return (
      <GlassCard>
        <p className="text-xs text-gray-500 mb-4">{feature.mockTitle}</p>
        <div className="space-y-3">
          {feature.mockEvents.map((event) => (
            <div key={event.label} className="flex items-start gap-3">
              <span className="text-xs text-gray-600 w-12 pt-0.5">{event.date}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <p className="text-sm text-gray-300">{event.label}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    )
  }

  if (feature.mockMessage) {
    return (
      <GlassCard>
        <p className="text-xs text-gray-500 mb-4">{feature.mockTitle}</p>
        <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
          <p className="text-sm text-gray-300 leading-relaxed">{feature.mockMessage}</p>
        </div>
      </GlassCard>
    )
  }

  return null
}

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Features built for{' '}
              <span className="gradient-text">life intelligence.</span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-gray-400">
              Every feature is designed to help you understand, navigate, and
              improve your life.
            </p>
          </div>

          <div className="space-y-24 pb-24">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon
              const isReversed = index % 2 !== 0
              return (
                <div
                  key={feature.title}
                  className={`flex flex-col ${
                    isReversed ? 'md:flex-row-reverse' : 'md:flex-row'
                  } items-center gap-12`}
                >
                  {/* Text side */}
                  <div className="flex-1">
                    <div className={`inline-flex rounded-lg p-2.5 ${feature.bg} mb-4`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">
                      {feature.title}
                    </h2>
                    <ul className="space-y-3">
                      {feature.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          <p className="text-gray-400">{bullet}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Mock UI side */}
                  <div className="flex-1 w-full max-w-md">
                    <FeatureMock feature={feature} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
