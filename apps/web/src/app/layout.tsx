import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { validateEnv } from '@/lib/env'
import { AnalyticsProvider } from '@/components/providers/analytics-provider'

// Validate environment variables once on server cold start.
// Throws immediately if required vars are missing, preventing silent misconfiguration.
validateEnv()

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'VitaMind — Intelligence for your life',
    template: '%s | VitaMind',
  },
  description:
    'The AI operating system for your life. Manage tasks, goals, habits, and daily planning powered by AI.',
  metadataBase: new URL('https://vitamind.app'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-surface-secondary font-sans text-text-primary antialiased min-h-dvh">
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  )
}
