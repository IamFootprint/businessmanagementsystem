import type { ReactNode } from 'react'
import { BottomNav } from '@/components/layout/BottomNav'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        paddingTop: 'var(--safe-top)',
        paddingBottom: 'calc(var(--bottom-nav-h) + var(--safe-bottom))',
      }}
    >
      <main className="flex-1 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  )
}
