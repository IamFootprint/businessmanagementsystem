import { apiRequestAuthenticated } from '@/lib/api-client.server'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function AttentionRow({ color, icon, title, sub, href, cta }: {
  color: string; icon: string; title: string; sub: string; href: string; cta: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] text-lg" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[var(--color-ink)]">{title}</p>
        <p className="text-[12px] text-[var(--color-ink-3)]">{sub}</p>
      </div>
      <a href={href} className="shrink-0 text-[12px] font-medium text-[var(--color-accent)] hover:underline">{cta} →</a>
    </div>
  )
}

export default async function DashboardPage() {
  const [needsReviewCount, unclearCount, latestTx, periods, unmatchedReceipts] = await Promise.all([
    apiRequestAuthenticated<{ meta: { total: number } }>(
      '/transactions?reviewStatus=NEEDS_REVIEW&pageSize=1'
    ).then(r => r.meta.total).catch(() => 0),

    apiRequestAuthenticated<{ meta: { total: number } }>(
      '/transactions?reviewStatus=UNCLEAR&pageSize=1'
    ).then(r => r.meta.total).catch(() => 0),

    apiRequestAuthenticated<{
      data: Array<{
        id: string
        transactionDate: string
        rawDescription: string
        amountCents: number
        direction: string
        category: { id: string; name: string; color?: string } | null
      }>
    }>('/transactions?pageSize=6&page=1').then(r => r.data).catch(() => []),

    apiRequestAuthenticated<{
      periods: Array<{ id: string; year: number; month: number; status: string }>
    }>('/periods').then(r => r.periods).catch(() => []),

    apiRequestAuthenticated<{ receipts: unknown[] }>(
      '/receipts?matchStatus=UNMATCHED'
    ).then(r => Array.isArray(r.receipts) ? r.receipts.length : 0).catch(() => 0),
  ])

  const openPeriod = periods.find(p => p.status === 'OPEN')
  const openPeriodLabel = openPeriod
    ? `${MONTHS[openPeriod.month - 1]} ${openPeriod.year}`
    : 'No open period'

  const attentionCount = (needsReviewCount > 0 ? 1 : 0) + (unclearCount > 0 ? 1 : 0) + (unmatchedReceipts > 0 ? 1 : 0)

  const today = new Date()
  const isCurrentPeriod = openPeriod?.year === today.getFullYear() && openPeriod?.month === (today.getMonth() + 1)
  const isPastPeriod = openPeriod && (openPeriod.year < today.getFullYear() || (openPeriod.year === today.getFullYear() && openPeriod.month < today.getMonth() + 1))
  const periodProgress = isCurrentPeriod
    ? Math.round((today.getDate() / new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()) * 100)
    : isPastPeriod ? 100 : 0

  return (
    <div className="px-[var(--page-gutter)] py-6 max-w-[1400px]">
      {/* Page head row */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">Overview</h1>
          <p className="mt-0.5 text-[13px] text-[var(--color-ink-3)]">
            Kgolaentle Holdings · Standard Bank Main · {openPeriodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/dashboard/import" className="text-[13px] text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:underline transition-colors">
            Import statement
          </a>
          <a href="/dashboard/transactions?reviewStatus=NEEDS_REVIEW" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-medium text-white transition-colors hover:opacity-90">
            ⚡ Review {needsReviewCount} transactions
          </a>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1 — Open period */}
        <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <p className="text-[11.5px] font-semibold uppercase tracking-[.04em] text-[var(--color-ink-3)]">Open Period</p>
          <p className="mt-2 text-[28px] font-semibold tracking-[-0.02em] tabular text-[var(--color-ink)]">{openPeriodLabel}</p>
          <div className="mt-3">
            <div className="h-[6px] rounded-full bg-[var(--color-border)]">
              <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${periodProgress}%` }} />
            </div>
            <p className="mt-1 text-[11.5px] tabular text-[var(--color-ink-3)]">{needsReviewCount} remaining</p>
          </div>
        </div>

        {/* Card 2 — Income MTD */}
        <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <p className="text-[11.5px] font-semibold uppercase tracking-[.04em] text-[var(--color-ink-3)]">Income MTD</p>
          <p className="mt-2 text-[28px] font-semibold tracking-[-0.02em] tabular" style={{ color: 'var(--color-pos)' }}>R 0</p>
          <p className="mt-1 text-[11.5px] text-[var(--color-ink-3)]">No data — connect P&amp;L</p>
        </div>

        {/* Card 3 — Expense MTD */}
        <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <p className="text-[11.5px] font-semibold uppercase tracking-[.04em] text-[var(--color-ink-3)]">Expense MTD</p>
          <p className="mt-2 text-[28px] font-semibold tracking-[-0.02em] tabular" style={{ color: 'var(--color-neg)' }}>R 0</p>
          <p className="mt-1 text-[11.5px] text-[var(--color-ink-3)]">No data — connect P&amp;L</p>
        </div>

        {/* Card 4 — Net Profit */}
        <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <p className="text-[11.5px] font-semibold uppercase tracking-[.04em] text-[var(--color-ink-3)]">Net Profit</p>
          <p className="mt-2 text-[28px] font-semibold tracking-[-0.02em] tabular text-[var(--color-ink)]">R 0</p>
          <p className="mt-1 text-[11.5px] text-[var(--color-ink-3)]">No data — connect P&amp;L</p>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mb-6">
        {/* Left: Needs your attention */}
        <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-ink)]">Needs your attention</p>
              <p className="text-[12px] text-[var(--color-ink-3)]">{attentionCount} items</p>
            </div>
          </div>
          <div className="space-y-3">
            {needsReviewCount > 0 && (
              <AttentionRow
                color="var(--color-warn-bg)"
                icon="📋"
                title={`${needsReviewCount} transactions need review`}
                sub="Categorise and approve imported transactions"
                href="/dashboard/transactions?reviewStatus=NEEDS_REVIEW"
                cta="Review now"
              />
            )}
            {unclearCount > 0 && (
              <AttentionRow
                color="var(--color-bad-bg)"
                icon="❓"
                title={`${unclearCount} unclear transactions`}
                sub="These transactions couldn't be auto-categorised"
                href="/dashboard/transactions?reviewStatus=UNCLEAR"
                cta="View"
              />
            )}
            {unmatchedReceipts > 0 && (
              <AttentionRow
                color="var(--color-info-bg)"
                icon="🧾"
                title={`${unmatchedReceipts} unmatched receipts`}
                sub="Match receipts captured via WhatsApp"
                href="/dashboard/receipts?matchStatus=UNMATCHED"
                cta="Match"
              />
            )}
            {needsReviewCount === 0 && unclearCount === 0 && unmatchedReceipts === 0 && (
              <p className="py-6 text-center text-[13px] text-[var(--color-ink-3)]">All caught up ✓</p>
            )}
          </div>
        </div>

        {/* Right: Latest transactions */}
        <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <p className="mb-4 text-[13px] font-semibold text-[var(--color-ink)]">Latest transactions</p>
          <div className="space-y-0">
            {latestTx.slice(0, 6).map(tx => {
              const date = new Date(tx.transactionDate)
              const mm = (date.getMonth() + 1).toString().padStart(2, '0')
              const dd = date.getDate().toString().padStart(2, '0')
              const isExpense = tx.direction === 'DEBIT'
              const amount = (tx.amountCents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })
              return (
                <div key={tx.id} className="flex items-center gap-3 border-b border-[var(--color-border-2)] py-2.5 last:border-0">
                  <span className="w-10 shrink-0 text-[11.5px] tabular font-mono text-[var(--color-ink-3)]">{mm}/{dd}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[var(--color-ink)]">{tx.rawDescription}</p>
                    {tx.category && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tx.category.color ?? 'var(--color-ink-3)' }} />
                        <span className="text-[11.5px] text-[var(--color-ink-3)]">{tx.category.name}</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[13px] tabular font-medium ${isExpense ? 'text-[var(--color-neg)]' : 'text-[var(--color-pos)]'}`}>
                    {isExpense ? '−' : '+'}R {amount}
                  </span>
                </div>
              )
            })}
            {latestTx.length === 0 && (
              <p className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">No transactions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
