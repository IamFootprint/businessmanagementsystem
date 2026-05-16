'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ArrowUpDown, LineChart, Receipt, MoreHorizontal } from 'lucide-react'

const NAV = [
  { href: '/home',         label: 'Home',         Icon: Home },
  { href: '/transactions', label: 'Transactions',  Icon: ArrowUpDown },
  { href: '/insights',     label: 'Insights',      Icon: LineChart },
  { href: '/receipts',     label: 'Receipts',      Icon: Receipt },
  { href: '/more',         label: 'More',          Icon: MoreHorizontal },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid var(--color-border)',
        paddingBottom: 'var(--safe-bottom)',
      }}
    >
      <div className="flex items-stretch" style={{ height: 'var(--bottom-nav-h)' }}>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-opacity active:opacity-60"
              aria-current={active ? 'page' : undefined}
            >
              {/* Gold indicator bar */}
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                  style={{
                    width: 24,
                    height: 2,
                    background: 'var(--color-accent)',
                    boxShadow: '0 0 8px rgba(212,160,23,0.6)',
                  }}
                />
              )}

              <Icon
                size={22}
                strokeWidth={active ? 2 : 1.5}
                style={{ color: active ? 'var(--color-accent)' : 'var(--color-ink-3)' }}
              />
              <span
                className="text-[10px] font-medium tracking-[.03em]"
                style={{ color: active ? 'var(--color-accent)' : 'var(--color-ink-3)' }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
