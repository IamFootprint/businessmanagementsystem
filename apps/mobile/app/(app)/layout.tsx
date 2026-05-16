import type { ReactNode } from 'react'
import { BottomNav } from '@/components/layout/BottomNav'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--color-bg)',
        paddingTop: 'var(--safe-top)',
      }}
    >
      {/* min-h-0 lets the flex child shrink so overflow-y-auto can take effect */}
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  )
}
