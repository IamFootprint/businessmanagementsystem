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
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ListFilter },
  { href: '/dashboard/import', label: 'Import', icon: ArrowUpFromLine },
  { href: '/dashboard/suppliers', label: 'Suppliers', icon: Building2 },
  { href: '/dashboard/receipts', label: 'Receipts', icon: Receipt },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
]

export function Sidebar({ activePath, onClose }: { activePath: string; onClose?: () => void }) {
  return (
    <aside
      className="flex h-screen w-60 flex-col"
      style={{ backgroundColor: 'var(--color-sidebar)', color: 'var(--color-sidebar-foreground)' }}
    >
      {/* Brand */}
      <div
        className="flex h-14 items-center justify-between border-b px-5"
        style={{ borderColor: 'var(--color-sidebar-hover)' }}
      >
        <div>
          <p className="text-sm font-bold tracking-wide" style={{ color: 'var(--color-sidebar-foreground)' }}>BMS</p>
          <p className="text-[10px]" style={{ color: 'var(--color-sidebar-muted)' }}>Kgolaentle Holdings</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 transition-colors hover:bg-[#1e293b]"
            aria-label="Close navigation"
            style={{ color: 'var(--color-sidebar-muted)' }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = activePath === href || (href !== '/dashboard' && activePath.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                !isActive && 'hover:bg-[#1e293b]',
              )}
              style={isActive ? {
                backgroundColor: 'var(--color-sidebar-active)',
                color: 'var(--color-sidebar-active-fg)',
              } : {
                color: 'var(--color-sidebar-foreground)',
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="shrink-0 border-t p-2" style={{ borderColor: 'var(--color-sidebar-hover)' }}>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-[#1e293b]"
            style={{ color: 'var(--color-sidebar-muted)' }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
