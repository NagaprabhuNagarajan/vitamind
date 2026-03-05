import Link from 'next/link'

/**
 * Custom 404 page with VitaMind branding and dark theme.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6" style={{ background: '#060810' }}>
      <div className="flex max-w-md flex-col items-center text-center">
        {/* 404 indicator */}
        <p
          className="mb-4 text-sm font-semibold tracking-[0.2em] uppercase"
          style={{
            background: 'linear-gradient(135deg, #A5B4FC, #C084FC)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          404
        </p>

        {/* Heading */}
        <h1
          className="mb-2 text-3xl font-bold"
          style={{
            background: 'linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.6))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Page not found
        </h1>

        {/* Description */}
        <p className="mb-8 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
          The page you are looking for does not exist or has been moved.
        </p>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl px-8 py-3 text-sm font-semibold text-white transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #A855F7)',
            boxShadow: '0 0 24px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
