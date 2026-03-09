import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import './globals.css'

const ScrollProgress = dynamic(
  () => import('@/components/ui/scroll-progress').then((m) => m.ScrollProgress),
  { ssr: false }
)

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
        <ScrollProgress />
        {children}
      </body>
    </html>
  )
}
