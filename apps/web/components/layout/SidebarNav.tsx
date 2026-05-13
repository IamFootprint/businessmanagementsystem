'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'

export function SidebarNav() {
  const pathname = usePathname()
  const activePath = pathname ?? '/dashboard'
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar activePath={activePath} />
      </div>

      {/* Mobile: top bar with hamburger */}
      <div
        className="flex h-14 items-center border-b px-4 md:hidden"
        style={{ backgroundColor: 'var(--color-sidebar)', borderColor: 'var(--color-sidebar-hover)' }}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md p-2 transition-colors hover:bg-[#1e293b]"
          aria-label="Open navigation"
          style={{ color: 'var(--color-sidebar-foreground)' }}
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="ml-3 text-sm font-bold" style={{ color: 'var(--color-sidebar-foreground)' }}>BMS</span>
      </div>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar activePath={activePath} onClose={() => setIsOpen(false)} />
      </div>
    </>
  )
}
