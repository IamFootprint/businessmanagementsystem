import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Lock, LockOpen, Download } from 'lucide-react'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

type CategoryItem = { categoryId: string; name: string; amountCents: number }
type SnapshotData = {
  businessId: string
  year: number
  month: number
  generatedAt: string
  totalRevenueCents: number
  totalExpenseCents: number
  netProfitCents: number
  revenueByCategory: CategoryItem[]
  expenseByCategory: CategoryItem[]
  uncategorisedRevenueCents: number
  uncategorisedExpenseCents: number
  transactionCount: number
}
type Period = {
  id: string
  year: number
  month: number
  status: string
  lockedAt: string | null
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmt(cents: number): string {
  return `R ${(Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export default async function MobileReportDetailPage({
  params,
}: {
  params: Promise<{ periodId: string }>
}) {
  const { periodId } = await params

  if (!/^[\w-]+$/.test(periodId)) {
    return (
      <div className="p-5">
        <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>Invalid period.</p>
      </div>
    )
  }

  let snapshot: SnapshotData | null = null
  let period: Period | null = null

  try {
    const [snapRes, periodsRes] = await Promise.allSettled([
      apiRequestAuthenticated<{ snapshot: SnapshotData }>(`/periods/${periodId}/report`),
      apiRequestAuthenticated<{ periods: Period[] }>('/periods'),
    ])
    if (snapRes.status === 'fulfilled') snapshot = snapRes.value.snapshot
    if (periodsRes.status === 'fulfilled') {
      period = periodsRes.value.periods.find(p => p.id === periodId) ?? null
    }
  } catch { /* fall through */ }

  const title = period
    ? `${MONTHS[period.month - 1]} ${period.year}`
    : snapshot
      ? `${MONTHS[snapshot.month - 1]} ${snapshot.year}`
      : 'Report'

  const netPositive = snapshot ? snapshot.netProfitCents >= 0 : null

  if (!snapshot) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Link href="/reports" className="touch-target -ml-2 rounded-xl">
            <ArrowLeft size={20} style={{ color: 'var(--color-ink-2)' }} />
          </Link>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}>
            {title}
          </h1>
        </div>
        <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
          <p className="text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            No report available. Lock the period first.
          </p>
          <Link
            href="/reports"
            className="rounded-lg px-4 py-2.5 text-[13px] font-medium"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-ink-2)' }}
          >
            Back to Reports
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/reports" className="touch-target -ml-2 rounded-xl">
            <ArrowLeft size={20} style={{ color: 'var(--color-ink-2)' }} />
          </Link>
          <div>
            <h1
              className="text-[18px] font-semibold leading-tight"
              style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h1>
            <p className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
              {snapshot.transactionCount} transactions
            </p>
          </div>
        </div>
        <a
          href={`/api/periods/${periodId}/export`}
          download
          className="touch-target rounded-xl"
          aria-label="Download CSV"
        >
          <Download size={18} style={{ color: 'var(--color-ink-3)' }} />
        </a>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4 animate-fade-up">
        {/* Net P&L hero */}
        <div
          className="card-accent overflow-hidden rounded-xl p-5"
          style={{
            background: netPositive
              ? `radial-gradient(ellipse at top left, rgba(52,211,153,0.08) 0%, var(--color-surface) 60%)`
              : `radial-gradient(ellipse at top left, rgba(248,113,113,0.08) 0%, var(--color-surface) 60%)`,
          }}
        >
          <p
            className="mb-1 text-[11px] font-semibold uppercase tracking-[.1em]"
            style={{ color: netPositive ? 'var(--color-pos)' : 'var(--color-neg)' }}
          >
            Net {netPositive ? 'Profit' : 'Loss'}
          </p>
          <p
            className="text-[42px] leading-none tracking-[-0.03em]"
            style={{
              fontFamily: 'var(--font-display)',
              color: netPositive ? 'var(--color-pos)' : 'var(--color-neg)',
            }}
          >
            {!netPositive && '−'}{fmt(snapshot.netProfitCents)}
          </p>
        </div>

        {/* Revenue / Expenses */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="card rounded-xl p-4"
            style={{ background: 'var(--pos-bg)', borderColor: 'rgba(52,211,153,0.2)' }}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <TrendingUp size={14} style={{ color: 'var(--color-pos)' }} />
              <p className="text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: 'var(--color-pos)' }}>
                Revenue
              </p>
            </div>
            <p
              className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
            >
              {fmt(snapshot.totalRevenueCents)}
            </p>
          </div>
          <div
            className="card rounded-xl p-4"
            style={{ background: 'var(--neg-bg)', borderColor: 'rgba(248,113,113,0.2)' }}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <TrendingDown size={14} style={{ color: 'var(--color-neg)' }} />
              <p className="text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: 'var(--color-neg)' }}>
                Expenses
              </p>
            </div>
            <p
              className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
            >
              {fmt(snapshot.totalExpenseCents)}
            </p>
          </div>
        </div>

        {/* Expense breakdown */}
        {snapshot.expenseByCategory.length > 0 && (
          <section>
            <p
              className="mb-2.5 text-[11px] font-semibold uppercase tracking-[.08em]"
              style={{ color: 'var(--color-ink-3)' }}
            >
              Expenses by Category
            </p>
            <div className="card overflow-hidden rounded-xl" style={{ borderColor: 'var(--color-border)' }}>
              {snapshot.expenseByCategory.map((e, i) => (
                <div
                  key={e.categoryId}
                  className="flex items-center justify-between px-4 py-3.5"
                  style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}
                >
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--color-ink)' }}>{e.name}</p>
                    {snapshot.totalExpenseCents > 0 && (
                      <p className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
                        {((e.amountCents / snapshot.totalExpenseCents) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <p className="text-[14px] font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-neg)' }}>
                    {fmt(e.amountCents)}
                  </p>
                </div>
              ))}
              {snapshot.uncategorisedExpenseCents > 0 && (
                <div
                  className="flex items-center justify-between px-4 py-3.5"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  <p className="text-[13px] italic" style={{ color: 'var(--color-ink-3)' }}>Uncategorised</p>
                  <p className="text-[14px] font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink-3)' }}>
                    {fmt(snapshot.uncategorisedExpenseCents)}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Revenue breakdown */}
        {snapshot.revenueByCategory.length > 0 && (
          <section className="pb-4">
            <p
              className="mb-2.5 text-[11px] font-semibold uppercase tracking-[.08em]"
              style={{ color: 'var(--color-ink-3)' }}
            >
              Revenue by Category
            </p>
            <div className="card overflow-hidden rounded-xl" style={{ borderColor: 'var(--color-border)' }}>
              {snapshot.revenueByCategory.map((r, i) => (
                <div
                  key={r.categoryId}
                  className="flex items-center justify-between px-4 py-3.5"
                  style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}
                >
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--color-ink)' }}>{r.name}</p>
                    {snapshot.totalRevenueCents > 0 && (
                      <p className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
                        {((r.amountCents / snapshot.totalRevenueCents) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <p className="text-[14px] font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-pos)' }}>
                    {fmt(r.amountCents)}
                  </p>
                </div>
              ))}
              {snapshot.uncategorisedRevenueCents > 0 && (
                <div
                  className="flex items-center justify-between px-4 py-3.5"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  <p className="text-[13px] italic" style={{ color: 'var(--color-ink-3)' }}>Uncategorised</p>
                  <p className="text-[14px] font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink-3)' }}>
                    {fmt(snapshot.uncategorisedRevenueCents)}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
