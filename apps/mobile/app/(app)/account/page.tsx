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
      <div className="px-4 py-6 text-[13px]" style={{ color: 'var(--color-bad)' }}>
        Unable to load your account. Try signing in again.
      </div>
    )
  }

  return <AccountClient me={me} sessions={sessions} />
}
