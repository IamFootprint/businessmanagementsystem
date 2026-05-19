import type { ReactNode } from 'react'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { Topbar } from '@/components/layout/Topbar'
import { StatusBar } from '@/components/layout/StatusBar'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const today = new Date()
  const thisMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`

  const [pendingCount, unmatchedReceipts, periodsData, reviewedThisMonth, totalThisMonth] = await Promise.all([
    apiRequestAuthenticated<{ meta: { total: number } }>('/transactions?reviewStatus=NEEDS_REVIEW&pageSize=1')
      .then(r => r.meta.total).catch(() => 0),
    apiRequestAuthenticated<{ receipts: unknown[] }>('/receipts?matchStatus=UNMATCHED')
      .then(r => Array.isArray(r.receipts) ? r.receipts.length : 0).catch(() => 0),
    apiRequestAuthenticated<{ periods: Array<{ id: string; year: number; month: number; status: string }> }>('/periods')
      .then(r => r.periods).catch(() => [] as Array<{ id: string; year: number; month: number; status: string }>),
    apiRequestAuthenticated<{ meta: { total: number } }>(
      `/transactions?reviewStatus=REVIEWED&pageSize=1&dateFrom=${thisMonthStart}`
    ).then(r => r.meta.total).catch(() => 0),
    apiRequestAuthenticated<{ meta: { total: number } }>(
      `/transactions?pageSize=1&dateFrom=${thisMonthStart}`
    ).then(r => r.meta.total).catch(() => 0),
  ])

  const openPeriod = (() => {
    const open = periodsData.find(p => p.status === 'OPEN')
    if (!open) return undefined
    return {
      label: `${MONTHS[open.month - 1]} ${open.year}`,
      status: 'open' as const,
      reviewed: reviewedThisMonth,
      total: totalThisMonth,
    }
  })()

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      <SidebarNav
        navCounts={{ transactions: pendingCount, receipts: unmatchedReceipts }}
        period={openPeriod}
      />
      <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        <Topbar pageTitle="BMS" period={openPeriod} />
        <main className="flex-1 overflow-y-auto pb-[26px]">
          {children}
        </main>
      </div>
      <StatusBar pendingCount={pendingCount} unmatchedReceipts={unmatchedReceipts} />
    </div>
  )
}
