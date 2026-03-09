import type { Metadata } from 'next'
import './globals.css'
import { ClientShell } from '@/components/ui/client-shell'

export const metadata: Metadata = {
  title: 'VitaMind -- Intelligence for your life',
  description:
    'VitaMind analyzes your habits, goals, and daily actions to guide you toward a better life.',
  openGraph: {
    title: 'VitaMind -- Intelligence for your life',
    description: 'Navigate your life with AI.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  )
}
