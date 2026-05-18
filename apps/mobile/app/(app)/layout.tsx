import type { ReactNode } from 'react'
import { BottomNav } from '@/components/layout/BottomNav'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

type Me = { id: string; role: string; name: string }

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Server-side role check. Drivers get the same shell but without the full
  // bottom nav — they only need Capture + My Submissions + Account.
  let role = 'TENANT_OWNER'
  try {
    const r = await apiRequestAuthenticated<{ user: Me }>('/auth/me')
    role = r.user.role
  } catch {
    // Middleware will already have redirected unauthenticated requests; fall through.
  }

  const isDriver = role === 'DRIVER'

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
      {!isDriver && <BottomNav />}
    </div>
  )
}
