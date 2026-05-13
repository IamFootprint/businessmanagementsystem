import type { ReactNode } from 'react'
import { SidebarNav } from '@/components/layout/SidebarNav'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <SidebarNav />
        <main className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
