import Link from 'next/link'
import { Camera, ListChecks, UserCircle2, LogOut } from 'lucide-react'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

type Me = {
  name: string
  email: string
  role: string
  defaultBusinessId: string | null
}

type Business = { id: string; name: string }

async function getMe(): Promise<Me | null> {
  try {
    const r = await apiRequestAuthenticated<{ user: Me }>('/auth/me')
    return r.user
  } catch {
    return null
  }
}

async function getBusinesses(): Promise<Business[]> {
  try {
    const r = await apiRequestAuthenticated<{ data: Business[] }>('/businesses')
    return r.data
  } catch {
    return []
  }
}

export default async function DriverHome() {
  const [me, businesses] = await Promise.all([getMe(), getBusinesses()])
  const defaultBiz = businesses.find((b) => b.id === me?.defaultBusinessId)

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 pt-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--color-ink-3)' }}>
          Welcome
        </p>
        <h1
          className="mt-1 text-[26px] font-semibold tracking-[-0.01em]"
          style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}
        >
          {me?.name ?? 'Driver'}
        </h1>
        {defaultBiz && (
          <p className="mt-1 text-[12.5px]" style={{ color: 'var(--color-ink-3)' }}>
            Submitting receipts to <span style={{ color: 'var(--color-accent)' }}>{defaultBiz.name}</span>
          </p>
        )}
      </header>

      {/* Primary CTA */}
      <Link
        href="/driver/capture"
        className="block rounded-2xl px-5 py-6 active:opacity-80 transition-opacity"
        style={{
          background: 'linear-gradient(135deg, var(--color-accent), #B8881A)',
          color: 'var(--color-accent-fg)',
          boxShadow: '0 10px 30px rgba(212,160,23,0.25)',
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(0,0,0,0.12)' }}
          >
            <Camera size={28} strokeWidth={2} />
          </div>
          <div>
            <p className="text-[18px] font-bold leading-tight">Capture receipt</p>
            <p className="mt-0.5 text-[12.5px] opacity-80">Snap a photo and we'll do the rest</p>
          </div>
        </div>
      </Link>

      <Link
        href="/driver/submissions"
        className="rounded-xl px-4 py-4 flex items-center gap-3 active:bg-[var(--color-surface-2)] transition-colors"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <ListChecks size={18} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--color-ink)' }}>
            My submissions
          </p>
          <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--color-ink-3)' }}>
            Review past receipts and their status
          </p>
        </div>
      </Link>

      <Link
        href="/account"
        className="rounded-xl px-4 py-4 flex items-center gap-3 active:bg-[var(--color-surface-2)] transition-colors"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <UserCircle2 size={18} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--color-ink)' }}>
            Account
          </p>
          <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--color-ink-3)' }}>
            Change password, sign out
          </p>
        </div>
      </Link>
    </div>
  )
}
