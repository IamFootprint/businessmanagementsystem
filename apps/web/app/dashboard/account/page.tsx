import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { AccountClient } from './AccountClient'

export type Me = {
  id: string
  email: string
  name: string
  role: string
  phone: string | null
  active: boolean
  lastLoginAt: string | null
  createdAt?: string
}

export type SessionRow = {
  id: string
  createdAt: string
  lastSeenAt: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
  current: boolean
}

async function getMe(): Promise<Me | null> {
  try {
    const r = await apiRequestAuthenticated<{ user: Me }>('/auth/me')
    return r.user
  } catch {
    return null
  }
}

async function getSessions(): Promise<SessionRow[]> {
  try {
    const r = await apiRequestAuthenticated<{ data: SessionRow[] }>('/auth/sessions')
    return r.data
  } catch {
    return []
  }
}

export default async function AccountPage() {
  const [me, sessions] = await Promise.all([getMe(), getSessions()])

  if (!me) {
    return (
      <div className="px-[var(--page-gutter)] py-6">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--color-ink)' }}>
          Account
        </h1>
        <div role="alert" className="mt-6 rounded-md px-4 py-3 text-sm" style={{ backgroundColor: 'var(--color-bad-bg)', color: 'var(--color-bad)' }}>
          Unable to load your account. Please refresh or sign in again.
        </div>
      </div>
    )
  }

  return <AccountClient me={me} sessions={sessions} />
}
