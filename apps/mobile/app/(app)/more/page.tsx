import Link from 'next/link'
import { ChevronRight, Zap, Building2, Tag, ArrowUpFromLine, BarChart3, LogOut, UserCircle2 } from 'lucide-react'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

type User = { name: string; email: string; role: string }

const MORE_ITEMS = [
  { href: '/account',    label: 'Account',       desc: 'Profile, password, sessions',      Icon: UserCircle2 },
  { href: '/rules',      label: 'Rules',         desc: 'Auto-categorisation patterns',     Icon: Zap },
  { href: '/suppliers',  label: 'Suppliers',     desc: 'Vendors and business profiles',    Icon: Building2 },
  { href: '/categories', label: 'Categories',    desc: 'Expense / revenue groupings',      Icon: Tag },
  { href: '/import',     label: 'Import',        desc: 'Upload bank statements (CSV)',     Icon: ArrowUpFromLine },
  { href: '/reports',    label: 'Period Reports', desc: 'Locked-period P&L statements',    Icon: BarChart3 },
]

export default async function MorePage() {
  let user: User | null = null
  try {
    const me = await apiRequestAuthenticated<{ user: User }>('/auth/me')
    user = me.user
  } catch { /* ignore */ }

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--color-ink)' }}>
          More
        </h1>
        {user && (
          <p className="mt-1 text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
            Signed in as <span style={{ color: 'var(--color-ink-2)' }}>{user.name}</span> · {user.role}
          </p>
        )}
      </div>

      <div className="card overflow-hidden rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {MORE_ITEMS.map(({ href, label, desc, Icon }, i) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-[var(--color-surface-2)]"
            style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--color-surface-2)' }}
            >
              <Icon size={16} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[13px] font-medium" style={{ color: 'var(--color-ink)' }}>{label}</span>
              <span className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>{desc}</span>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--color-ink-3)' }} />
          </Link>
        ))}
      </div>

      <form action="/api/auth/logout" method="post" className="mt-2">
        <button
          type="submit"
          formAction="/api/auth/logout"
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-medium transition-opacity active:opacity-60"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-neg)' }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </form>
    </div>
  )
}
