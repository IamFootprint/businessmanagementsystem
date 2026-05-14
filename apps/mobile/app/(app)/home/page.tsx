import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { TrendingUp, TrendingDown, ArrowRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

type Period = { id: string; year: number; month: number; status: string; lockedAt: string | null }
type Transaction = {
  id: string
  description: string
  amountCents: number
  type: 'INCOME' | 'EXPENSE'
  date: string
  categoryName?: string
}
type Snapshot = {
  totalRevenueCents: number
  totalExpenseCents: number
  netProfitCents: number
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(cents: number): string {
  return `R ${(Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function HomePage() {
  const [periodsResult, txResult, pendingResult] = await Promise.allSettled([
    apiRequestAuthenticated<{ periods: Period[] }>('/periods'),
    apiRequestAuthenticated<{ transactions: Transaction[]; meta: { total: number } }>('/transactions?pageSize=6'),
    apiRequestAuthenticated<{ meta: { total: number } }>('/transactions?reviewStatus=NEEDS_REVIEW&pageSize=1'),
  ])

  const periods = periodsResult.status === 'fulfilled' ? (periodsResult.value.periods ?? []) : []
  const transactions = txResult.status === 'fulfilled' ? (txResult.value.transactions ?? []) : []
  const txTotal = txResult.status === 'fulfilled' ? (txResult.value.meta?.total ?? 0) : 0
  const pendingCount = pendingResult.status === 'fulfilled' ? (pendingResult.value.meta?.total ?? 0) : 0

  const openPeriod = periods.find(p => p.status === 'OPEN')
  const lockedPeriods = periods
    .filter(p => p.status === 'LOCKED')
    .sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month))
  const latestLocked = lockedPeriods[0]

  let snapshot: Snapshot | null = null
  let snapshotPeriod: Period | null = null
  if (latestLocked) {
    try {
      const r = await apiRequestAuthenticated<{ snapshot: Snapshot }>(`/periods/${latestLocked.id}/report`)
      snapshot = r.snapshot
      snapshotPeriod = latestLocked
    } catch { /* no snapshot */ }
  }

  const displayPeriod = openPeriod ?? latestLocked
  const netPositive = snapshot ? snapshot.netProfitCents >= 0 : null

  return (
    <div className="flex flex-col" style={{ paddingBottom: 8 }}>
      {/* Header */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="text-[13px] animate-fade-in" style={{ color: 'var(--color-ink-3)' }}>
          {greeting()}
        </p>
        <h1
          className="mt-0.5 text-[22px] font-semibold animate-fade-in delay-1"
          style={{ color: 'var(--color-ink)' }}
        >
          Kgolaentle Holdings
        </h1>
        {displayPeriod && (
          <div className="mt-2 flex items-center gap-2 animate-fade-in delay-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[.06em]"
              style={
                openPeriod
                  ? { background: 'rgba(251,146,60,0.12)', color: 'var(--color-warn)' }
                  : { background: 'var(--pos-bg)', color: 'var(--color-pos)' }
              }
            >
              {openPeriod ? <Clock size={10} strokeWidth={2} /> : <CheckCircle2 size={10} strokeWidth={2} />}
              {openPeriod ? 'Open' : 'Locked'}
            </span>
            <span className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
              {MONTHS[displayPeriod.month - 1]} {displayPeriod.year}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4">
        {/* Hero P&L card (only when snapshot available) */}
        {snapshot && snapshotPeriod ? (
          <div className="card-accent animate-scale-in delay-1 overflow-hidden rounded-xl p-5"
            style={{
              background: `radial-gradient(ellipse at top left, rgba(212,160,23,0.08) 0%, var(--color-surface) 60%)`,
            }}
          >
            <p
              className="mb-1 text-[11px] font-semibold uppercase tracking-[.1em]"
              style={{ color: 'var(--color-accent)' }}
            >
              Net {snapshot.netProfitCents >= 0 ? 'Profit' : 'Loss'} · {MONTHS_SHORT[snapshotPeriod.month - 1]} {snapshotPeriod.year}
            </p>
            <p
              className="text-[44px] leading-none tracking-[-0.03em]"
              style={{
                fontFamily: 'var(--font-display)',
                color: netPositive ? 'var(--color-pos)' : 'var(--color-neg)',
              }}
            >
              {!netPositive && '−'}
              {fmt(snapshot.netProfitCents)}
            </p>

            {/* Revenue / Expenses row */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div
                className="rounded-lg px-3 py-2.5"
                style={{ background: 'var(--pos-bg)', border: '1px solid rgba(52,211,153,0.15)' }}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <TrendingUp size={12} style={{ color: 'var(--color-pos)' }} />
                  <span className="text-[10.5px] font-medium uppercase tracking-[.05em]" style={{ color: 'var(--color-pos)' }}>
                    Revenue
                  </span>
                </div>
                <p className="text-[16px] font-semibold tabular-nums" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}>
                  {fmt(snapshot.totalRevenueCents)}
                </p>
              </div>
              <div
                className="rounded-lg px-3 py-2.5"
                style={{ background: 'var(--neg-bg)', border: '1px solid rgba(248,113,113,0.15)' }}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <TrendingDown size={12} style={{ color: 'var(--color-neg)' }} />
                  <span className="text-[10.5px] font-medium uppercase tracking-[.05em]" style={{ color: 'var(--color-neg)' }}>
                    Expenses
                  </span>
                </div>
                <p className="text-[16px] font-semibold tabular-nums" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}>
                  {fmt(snapshot.totalExpenseCents)}
                </p>
              </div>
            </div>

            <Link
              href={`/reports/${snapshotPeriod.id}`}
              className="mt-3 flex items-center gap-1 text-[12px] font-medium transition-opacity"
              style={{ color: 'var(--color-accent)' }}
            >
              Full report <ArrowRight size={12} />
            </Link>
          </div>
        ) : (
          <div
            className="card animate-scale-in delay-1 rounded-xl p-5"
            style={{
              background: `radial-gradient(ellipse at top left, rgba(212,160,23,0.05) 0%, var(--color-surface) 60%)`,
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[.1em]" style={{ color: 'var(--color-accent)' }}>
              Current Period
            </p>
            {openPeriod ? (
              <>
                <p className="mt-1 text-[28px] tracking-[-0.02em]" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                  {MONTHS[openPeriod.month - 1]} {openPeriod.year}
                </p>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
                  Period in progress · {txTotal} transactions
                </p>
                <Link
                  href="/reports"
                  className="mt-3 flex items-center gap-1 text-[12px] font-medium"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Lock period to generate report <ArrowRight size={12} />
                </Link>
              </>
            ) : (
              <p className="mt-2 text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
                No active period
              </p>
            )}
          </div>
        )}

        {/* Pending actions */}
        {pendingCount > 0 && (
          <Link
            href="/transactions"
            className="card flex items-center justify-between rounded-xl px-4 py-3.5 animate-fade-up delay-2"
            style={{ borderColor: 'rgba(251,146,60,0.3)', background: 'rgba(251,146,60,0.05)' }}
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={18} style={{ color: 'var(--color-warn)' }} />
              <div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--color-ink)' }}>
                  {pendingCount} transaction{pendingCount !== 1 ? 's' : ''} need review
                </p>
                <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
                  Tap to review
                </p>
              </div>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--color-ink-3)' }} />
          </Link>
        )}

        {/* Recent transactions */}
        {transactions.length > 0 && (
          <div className="animate-fade-up delay-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--color-ink-3)' }}>
                Recent
              </p>
              <Link
                href="/transactions"
                className="flex items-center gap-1 text-[12px] font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
                All <ArrowRight size={11} />
              </Link>
            </div>

            <div
              className="card overflow-hidden rounded-xl"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {transactions.map((tx, i) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-4 py-3.5"
                  style={{
                    borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  <div className="flex min-w-0 flex-col">
                    <p
                      className="truncate text-[13px] font-medium"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      {tx.description || tx.categoryName || 'Transaction'}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
                      {formatDate(tx.date)}
                      {tx.categoryName && ` · ${tx.categoryName}`}
                    </p>
                  </div>
                  <p
                    className="ml-4 shrink-0 text-[14px] font-semibold tabular-nums"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: tx.type === 'INCOME' ? 'var(--color-pos)' : 'var(--color-neg)',
                    }}
                  >
                    {tx.type === 'INCOME' ? '+' : '−'}{fmt(tx.amountCents)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
