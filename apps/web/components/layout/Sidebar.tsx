'use client'
import Image from 'next/image'
import Link from 'next/link'
import {
  LayoutDashboard,
  ArrowUpFromLine,
  ListFilter,
  Building2,
  Receipt,
  BarChart3,
  LogOut,
  X,
  ChevronDown,
  Zap,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  activePath: string
  onClose?: () => void
  navCounts?: { transactions?: number; receipts?: number }
  period?: { label: string; status: 'open' | 'locked'; reviewed: number; total: number }
  user?: { name: string; email: string }
}

const NAV_ITEMS = [
  { href: '/dashboard',              label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ListFilter,      countKey: 'transactions' as const },
  { href: '/dashboard/rules',        label: 'Rules',        icon: Zap },
  { href: '/dashboard/import',       label: 'Import',       icon: ArrowUpFromLine },
  { href: '/dashboard/suppliers',    label: 'Suppliers',    icon: Building2 },
  { href: '/dashboard/categories',   label: 'Categories',   icon: Tag },
  { href: '/dashboard/receipts',     label: 'Receipts',     icon: Receipt,         countKey: 'receipts' as const },
  { href: '/dashboard/reports',      label: 'Reports',      icon: BarChart3 },
]

const isActive = (href: string, activePath: string) =>
  href === '/dashboard'
    ? activePath === '/dashboard'
    : activePath.startsWith(href)

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Sidebar({
  activePath,
  onClose,
  navCounts,
  period,
  user = { name: 'Lerato M.', email: 'lerato@kgolaentle.co.za' },
}: SidebarProps) {
  const defaultPeriod = period ?? {
    label: 'Jan 2026',
    status: 'open' as const,
    reviewed: 0,
    total: 0,
  }

  const progressPct =
    defaultPeriod.total > 0
      ? Math.round((defaultPeriod.reviewed / defaultPeriod.total) * 100)
      : 0

  return (
    <aside
      className="flex h-screen w-[248px] flex-col shrink-0"
      style={{ backgroundColor: 'var(--color-side-bg)', color: 'var(--color-side-ink)' }}
    >
      {/* ── 1. Brand row ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 px-3 py-4 shrink-0 border-b"
        style={{ borderColor: 'var(--color-side-divider)' }}
      >
        <Image
          src="/brand/kh-logo-128.png"
          width={36}
          height={36}
          alt="KH"
          className="rounded-lg shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold leading-tight truncate" style={{ color: 'var(--color-side-ink)' }}>
            Kgolaentle Holdings
          </p>
          <p className="text-[11.5px] leading-tight" style={{ color: 'var(--color-side-ink-2)' }}>
            VAT 4520198765
          </p>
        </div>
        {onClose ? (
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 transition-colors hover:bg-[var(--color-side-bg-2)]"
            aria-label="Close navigation"
            style={{ color: 'var(--color-side-ink-2)' }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            disabled
            title="Business switching coming soon"
            className="shrink-0 rounded p-1 opacity-40"
            aria-label="Switch business"
          >
            <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--color-side-ink-2)' }} />
          </button>
        )}
      </div>

      {/* ── 2. Nav section ───────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto">
        <p
          className="text-[10.5px] font-semibold uppercase tracking-[.08em] px-3 pt-3 pb-1.5"
          style={{ color: 'var(--color-side-ink-2)' }}
        >
          WORKSPACE
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon, countKey }) => {
          const active = isActive(href, activePath)
          const count = countKey ? navCounts?.[countKey] : undefined

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] mx-1 cursor-pointer transition-colors',
                active
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'hover:bg-[var(--color-side-bg-2)] text-[var(--color-side-ink)]',
              )}
            >
              <Icon className="h-4 w-4 shrink-0 stroke-[1.5]" />
              <span className="text-[13.5px] font-medium flex-1">{label}</span>
              {count !== undefined && (
                <span
                  className={cn(
                    'text-[11px] font-mono font-semibold ml-auto px-1.5 py-px rounded-full',
                    active ? 'bg-white/20 text-white' : 'bg-[var(--color-side-bg-2)] text-[var(--color-side-ink-2)]',
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── 3. Workspace Pulse card ──────────────────────────────── */}
      <div
        className="mx-2 mt-3 p-3 rounded-[10px] shrink-0"
        style={{ backgroundColor: 'var(--color-side-bg-2)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold" style={{ color: 'var(--color-side-ink)' }}>
            {defaultPeriod.label}
          </p>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-side-ink-2)' }}>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: defaultPeriod.status === 'open' ? '#F59E0B' : 'var(--color-side-ink-2)' }}
            />
            {defaultPeriod.status}
          </span>
        </div>
        <div
          className="mt-2 h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--color-side-divider)' }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${progressPct}%`, backgroundColor: 'var(--color-accent)' }}
          />
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[10.5px] font-mono text-[var(--color-side-ink-2)]">
          <span>Review progress</span>
          <span className="tabular">{defaultPeriod.reviewed}/{defaultPeriod.total}</span>
        </div>
      </div>

      {/* ── 4. User footer ───────────────────────────────────────── */}
      <div
        className="shrink-0 border-t px-3 py-3 flex items-center gap-2.5 mt-3"
        style={{ borderColor: 'var(--color-side-divider)' }}
      >
        <div
          className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-[#F59E0B] to-[#DB2777]"
        >
          <span className="text-[11px] font-bold text-white leading-none">
            {getInitials(user.name)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-medium leading-tight truncate" style={{ color: 'var(--color-side-ink)' }}>
            {user.name}
          </p>
          <p className="text-[11px] leading-tight truncate" style={{ color: 'var(--color-side-ink-2)' }}>
            {user.email}
          </p>
        </div>
        <form action="/api/auth/logout" method="POST" className="shrink-0">
          <button
            type="submit"
            className="rounded-md p-1 transition-colors"
            aria-label="Sign out"
            style={{ color: 'var(--color-side-ink-2)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-side-ink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-side-ink-2)')}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </aside>
  )
}
