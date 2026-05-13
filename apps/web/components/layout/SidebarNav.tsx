'use client'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

export function SidebarNav() {
  const pathname = usePathname()
  return <Sidebar activePath={pathname} />
}
