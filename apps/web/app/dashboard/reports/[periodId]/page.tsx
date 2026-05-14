import Link from 'next/link'
import { ArrowLeft, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'
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

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// API returns all amounts as positive cents; sign is applied at the call site
function fmt(cents: number) {
  return `R ${(Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ periodId: string }>
}) {
  const { periodId } = await params

  if (!/^[\w-]+$/.test(periodId)) {
    return (
      <div className="p-8">
        <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
          Invalid period ID.
        </p>
      </div>
    )
  }

  let snapshot: SnapshotData | null = null
  try {
    const response = await apiRequestAuthenticated<{ snapshot: SnapshotData }>(
      `/periods/${periodId}/report`
    )
    snapshot = response.snapshot
  } catch {
    // fall through to null check below
  }

  if (!snapshot) {
    return (
      <div className="p-8">
        <Link
          href="/dashboard/reports"
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] transition-colors"
          style={{ color: 'var(--color-ink-2)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Link>
        <div
          className="mt-6 rounded-[10px] border py-12 text-center"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-panel)',
          }}
        >
          <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
            Report not available. Lock the period first to generate a snapshot.
          </p>
        </div>
      </div>
    )
  }

  const title = `${MONTH_NAMES[snapshot.month - 1]} ${snapshot.year}`
  const netPositive = snapshot.netProfitCents >= 0

  return (
    <div className="p-8">
      {/* Back + download */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard/reports"
          className="inline-flex items-center gap-1.5 text-[13px] transition-colors hover:text-[var(--color-ink)]"
          style={{ color: 'var(--color-ink-2)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Link>
        <a
          href={`/api/periods/${periodId}/export`}
          download
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--color-panel-2)]"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-ink-2)',
          }}
        >
          <Download className="h-4 w-4" />
          Download CSV
        </a>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1
          className="text-[26px] font-semibold tracking-[-0.02em]"
          style={{ color: 'var(--color-ink)' }}
        >
          {title} — P&amp;L Report
        </h1>
        <p className="mt-0.5 text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
          Generated {new Date(snapshot.generatedAt).toLocaleString('en-ZA')} · {snapshot.transactionCount} transactions
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Revenue */}
        <div
          className="rounded-[10px] border p-5"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-panel)',
          }}
        >
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--color-pos)' }} />
            <p className="text-[12px] font-medium" style={{ color: 'var(--color-ink-3)' }}>
              Total Revenue
            </p>
          </div>
          <p
            className="text-[26px] font-semibold tracking-[-0.02em] tabular-nums"
            style={{ color: 'var(--color-pos)' }}
          >
            {fmt(snapshot.totalRevenueCents)}
          </p>
        </div>

        {/* Expenses */}
        <div
          className="rounded-[10px] border p-5"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-panel)',
          }}
        >
          <div className="mb-1 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" style={{ color: 'var(--color-neg)' }} />
            <p className="text-[12px] font-medium" style={{ color: 'var(--color-ink-3)' }}>
              Total Expenses
            </p>
          </div>
          <p
            className="text-[26px] font-semibold tracking-[-0.02em] tabular-nums"
            style={{ color: 'var(--color-neg)' }}
          >
            {fmt(snapshot.totalExpenseCents)}
          </p>
        </div>

        {/* Net Profit */}
        <div
          className="rounded-[10px] border p-5"
          style={{
            borderColor: netPositive
              ? 'color-mix(in srgb, var(--color-pos) 30%, transparent)'
              : 'color-mix(in srgb, var(--color-neg) 30%, transparent)',
            backgroundColor: netPositive
              ? 'color-mix(in srgb, var(--color-pos) 8%, transparent)'
              : 'color-mix(in srgb, var(--color-neg) 8%, transparent)',
          }}
        >
          <div className="mb-1 flex items-center gap-2">
            <Minus className="h-4 w-4" style={{ color: netPositive ? 'var(--color-pos)' : 'var(--color-neg)' }} />
            <p className="text-[12px] font-medium" style={{ color: 'var(--color-ink-3)' }}>
              Net Profit / Loss
            </p>
          </div>
          <p
            className="text-[26px] font-semibold tracking-[-0.02em] tabular-nums"
            style={{ color: netPositive ? 'var(--color-pos)' : 'var(--color-neg)' }}
          >
            {netPositive ? '' : '−'}{fmt(snapshot.netProfitCents)}
          </p>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-[var(--color-border)] my-8" />

      {/* Expense breakdown */}
      {snapshot.expenseByCategory.length > 0 && (
        <div className="mb-8">
          <h2
            className="mb-3 text-[16px] font-semibold"
            style={{ color: 'var(--color-ink)' }}
          >
            Expenses by Category
          </h2>
          <div
            className="rounded-[10px] border overflow-hidden"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-panel)',
            }}
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr
                  className="border-b"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-panel-2)',
                  }}
                >
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[.06em]"
                    style={{ color: 'var(--color-ink-3)' }}
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[.06em]"
                    style={{ color: 'var(--color-ink-3)' }}
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[.06em]"
                    style={{ color: 'var(--color-ink-3)' }}
                  >
                    % of expenses
                  </th>
                </tr>
              </thead>
              <tbody>
                {snapshot.expenseByCategory.map((e) => (
                  <tr
                    key={e.categoryId}
                    className="border-b"
                    style={{ borderColor: 'var(--color-border-2)' }}
                  >
                    <td className="px-4 py-3" style={{ color: 'var(--color-ink)' }}>
                      {e.name}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono tabular-nums"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      {fmt(e.amountCents)}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      style={{ color: 'var(--color-ink-3)' }}
                    >
                      {snapshot.totalExpenseCents > 0
                        ? `${((e.amountCents / snapshot.totalExpenseCents) * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
                {snapshot.uncategorisedExpenseCents > 0 && (
                  <tr
                    className="border-b"
                    style={{ borderColor: 'var(--color-border-2)' }}
                  >
                    <td
                      className="px-4 py-3 italic"
                      style={{ color: 'var(--color-ink-3)' }}
                    >
                      Uncategorised
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono tabular-nums"
                      style={{ color: 'var(--color-ink-3)' }}
                    >
                      {fmt(snapshot.uncategorisedExpenseCents)}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      style={{ color: 'var(--color-ink-3)' }}
                    >
                      {snapshot.totalExpenseCents > 0
                        ? `${((snapshot.uncategorisedExpenseCents / snapshot.totalExpenseCents) * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue breakdown */}
      {snapshot.revenueByCategory.length > 0 && (
        <div>
          <h2
            className="mb-3 text-[16px] font-semibold"
            style={{ color: 'var(--color-ink)' }}
          >
            Revenue by Category
          </h2>
          <div
            className="rounded-[10px] border overflow-hidden"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-panel)',
            }}
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr
                  className="border-b"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-panel-2)',
                  }}
                >
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[.06em]"
                    style={{ color: 'var(--color-ink-3)' }}
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[.06em]"
                    style={{ color: 'var(--color-ink-3)' }}
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[.06em]"
                    style={{ color: 'var(--color-ink-3)' }}
                  >
                    % of revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {snapshot.revenueByCategory.map((r) => (
                  <tr
                    key={r.categoryId}
                    className="border-b"
                    style={{ borderColor: 'var(--color-border-2)' }}
                  >
                    <td className="px-4 py-3" style={{ color: 'var(--color-ink)' }}>
                      {r.name}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono tabular-nums"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      {fmt(r.amountCents)}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      style={{ color: 'var(--color-ink-3)' }}
                    >
                      {snapshot.totalRevenueCents > 0
                        ? `${((r.amountCents / snapshot.totalRevenueCents) * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
                {snapshot.uncategorisedRevenueCents > 0 && (
                  <tr
                    className="border-b"
                    style={{ borderColor: 'var(--color-border-2)' }}
                  >
                    <td
                      className="px-4 py-3 italic"
                      style={{ color: 'var(--color-ink-3)' }}
                    >
                      Uncategorised
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono tabular-nums"
                      style={{ color: 'var(--color-ink-3)' }}
                    >
                      {fmt(snapshot.uncategorisedRevenueCents)}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      style={{ color: 'var(--color-ink-3)' }}
                    >
                      {snapshot.totalRevenueCents > 0
                        ? `${((snapshot.uncategorisedRevenueCents / snapshot.totalRevenueCents) * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
