import { Check } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { GlassCard } from '@/components/ui/glass-card'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to start organizing your life.',
    cta: 'Get Started',
    ctaHref: '#waitlist',
    ctaStyle: 'border border-white/10 text-white hover:bg-white/5',
    features: [
      'Unlimited tasks and goals',
      'Habit tracking with streaks',
      'Basic momentum score',
      'Daily task management',
      'Mobile and web access',
    ],
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    description: 'Full AI intelligence for optimizing your life.',
    cta: 'Join Beta',
    ctaHref: '#waitlist',
    ctaStyle:
      'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-glow-md',
    badge: 'Most Popular',
    features: [
      'Everything in Free',
      'AI Life Coach assistant',
      'Life trajectory predictions',
      'Pattern Oracle insights',
      'Burnout Radar alerts',
      'Life domain velocity tracking',
      'Weekly AI intelligence reports',
      'Advanced Life Timeline',
      'Priority support',
    ],
  },
]

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Simple, transparent pricing.
            </h1>
            <p className="mx-auto max-w-lg text-lg text-gray-400">
              Start free. Upgrade when you want the full power of AI life
              intelligence.
            </p>
            <p className="mt-3 text-sm text-primary-400">
              Save 20% with annual billing ($86/year)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {PLANS.map((plan) => (
              <GlassCard
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.badge
                    ? 'border-primary/30 shadow-glow-sm'
                    : ''
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-secondary px-4 py-1 text-xs font-semibold text-white">
                    {plan.badge}
                  </span>
                )}

                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-1">
                    {plan.name}
                  </h2>
                  <p className="text-sm text-gray-400">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">
                    {plan.price}
                  </span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-primary-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.ctaHref}
                  className={`block rounded-xl px-6 py-3 text-center text-sm font-semibold transition-all ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </a>
              </GlassCard>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
