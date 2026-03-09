'use client'

import dynamic from 'next/dynamic'

const ScrollProgress = dynamic(
  () => import('@/components/ui/scroll-progress').then((m) => m.ScrollProgress),
  { ssr: false }
)

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScrollProgress />
      {children}
    </>
  )
}
