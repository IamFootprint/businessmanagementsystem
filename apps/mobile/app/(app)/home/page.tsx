import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { TrendingUp, TrendingDown, AlertCircle, ArrowRight, Building2 } from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type BusinessBreakdown = {
  id: string
  slug: string
  name: string
  revenueCents: number
  expenseCents: number
  netCents: number
  count: number
}

type Kpis = {
  totalRevenueCents: number
  totalExpenseCents: number
  netCents: number
  transactionCount: number
  categorisedPct: number
  personalCount: number
}

type AnalyticsResponse = {
  kpis: Kpis
  perBusiness: BusinessBreakdown[]
  businesses: { id: string; slug: string; name: string }[]
  unassignedCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmt(cents: number): string {
  return `R ${(Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function mtdRange(): { from: string; to: string; month: number; year: number } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return { from, to, month, year }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  // Drivers don't see the financial home — bounce them straight to the capture portal.
  try {
    const me = await apiRequestAuthenticated<{ user: { role: string } }>('/auth/me')
    if (me.user.role === 'DRIVER') {
      const { redirect } = await import('next/navigation')
      redirect('/driver')
    }
  } catch {
    // ignore — middleware handles unauthenticated
  }

  const { from, to, month, year } = mtdRange()

  const [analyticsResult, pendingResult] = await Promise.allSettled([
    apiRequestAuthenticated<AnalyticsResponse>(`/analytics/overview?from=${from}&to=${to}`),
    apiRequestAuthenticated<{ meta: { total: number } }>('/transactions?reviewStatus=NEEDS_REVIEW&pageSize=1'),
  ])

  const analytics = analyticsResult.status === 'fulfilled' ? analyticsResult.value : null
  const kpis = analytics?.kpis ?? null
  const perBusiness: BusinessBreakdown[] = analytics?.perBusiness ?? []
  const pendingCount = pendingResult.status === 'fulfilled' ? (pendingResult.value.meta?.total ?? 0) : 0
  const netPositive = kpis ? kpis.netCents >= 0 : null

  return (
    <div className="flex flex-col" style={{ paddingBottom: 24 }}>

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <p className="text-[13px] animate-fade-in" style={{ color: 'var(--color-ink-3)' }}>
          {greeting()}
        </p>
        <h1
          className="mt-0.5 text-[22px] font-semibold animate-fade-in delay-1"
          style={{ color: 'var(--color-ink)' }}
        >
          Kgolaentle Holdings
        </h1>
        <p className="mt-1 text-[12px] font-medium uppercase tracking-[.07em] animate-fade-in delay-2"
          style={{ color: 'var(--color-accent)' }}
        >
          {MONTHS[month - 1]} {year} · Month to date
        </p>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4">

        {/* ── MTD P&L Hero ── */}
        {kpis ? (
          <div
            className="card-accent animate-scale-in delay-1 overflow-hidden rounded-xl p-5"
            style={{
              background: `radial-gradient(ellipse at top left, rgba(212,160,23,0.08) 0%, var(--color-surface) 60%)`,
            }}
          >
            <p
              className="mb-1 text-[11px] font-semibold uppercase tracking-[.1em]"
              style={{ color: 'var(--color-accent)' }}
            >
              Net {kpis.netCents >= 0 ? 'Profit' : 'Loss'} · MTD
            </p>

            <p
              className="text-[44px] leading-none tracking-[-0.03em]"
              style={{
                fontFamily: 'var(--font-display)',
                color: netPositive ? 'var(--color-pos)' : 'var(--color-neg)',
              }}
            >
              {!netPositive && '−'}{fmt(kpis.netCents)}
            </p>

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
                  {fmt(kpis.totalRevenueCents)}
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
                  {fmt(kpis.totalExpenseCents)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
                {kpis.transactionCount} transactions · {kpis.categorisedPct}% categorised
              </p>
              <Link
                href="/insights"
                className="flex items-center gap-1 text-[12px] font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
                Full insights <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="card animate-scale-in delay-1 rounded-xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[.1em]" style={{ color: 'var(--color-accent)' }}>
              {MONTHS[month - 1]} {year} · Month to date
            </p>
            <p className="mt-2 text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
              No data available for this period.
            </p>
          </div>
        )}

        {/* ── Pending review alert ── */}
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
                  {pendingCount.toLocaleString()} transaction{pendingCount !== 1 ? 's' : ''} need review
                </p>
                <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>Tap to categorise</p>
              </div>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--color-ink-3)' }} />
          </Link>
        )}

        {/* ── Per-business breakdown ── */}
        {perBusiness.length > 0 && (
          <div className="animate-fade-up delay-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--color-ink-3)' }}>
                Businesses
              </p>
              <Link
                href="/insights"
                className="flex items-center gap-1 text-[12px] font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
                All <ArrowRight size={11} />
              </Link>
            </div>

            <div className="flex flex-col gap-2.5">
              {perBusiness.map((biz) => {
                const isProfit = biz.netCents >= 0
                return (
                  <Link
                    key={biz.id}
                    href={`/insights?businessId=${biz.id}`}
                    className="card overflow-hidden rounded-xl"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="px-4 py-3.5">
                      {/* Business name row */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 size={13} style={{ color: 'var(--color-ink-3)', flexShrink: 0 }} />
                          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-ink)' }}>
                            {biz.name}
                          </p>
                        </div>
                        <ArrowRight size={13} style={{ color: 'var(--color-ink-3)', flexShrink: 0 }} />
                      </div>

                      {/* Net P&L */}
                      <p
                        className="text-[26px] leading-none tracking-[-0.02em] mb-2.5"
                        style={{
                          fontFamily: 'var(--font-display)',
                          color: isProfit ? 'var(--color-pos)' : 'var(--color-neg)',
                        }}
                      >
                        {!isProfit && '−'}{fmt(biz.netCents)}
                      </p>

                      {/* Revenue / Expenses sub-row */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={11} style={{ color: 'var(--color-pos)' }} />
                          <span className="text-[12px] tabular-nums" style={{ color: 'var(--color-ink-3)', fontFamily: 'var(--font-display)' }}>
                            {fmt(biz.revenueCents)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingDown size={11} style={{ color: 'var(--color-neg)' }} />
                          <span className="text-[12px] tabular-nums" style={{ color: 'var(--color-ink-3)', fontFamily: 'var(--font-display)' }}>
                            {fmt(biz.expenseCents)}
                          </span>
                        </div>
                        <span className="ml-auto text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
                          {biz.count} txns
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
