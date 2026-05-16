'use client'
import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Wallet, Receipt, Building2, BarChart3 } from 'lucide-react'
import type { AnalyticsOverview } from './page'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatRand(cents: number, compact = false): string {
  const r = Math.round(Math.abs(cents) / 100)
  if (compact && r >= 1_000_000) return `R${(r / 1_000_000).toFixed(1)}M`
  if (compact && r >= 1_000) return `R${(r / 1_000).toFixed(0)}k`
  return `R${r.toLocaleString('en-ZA')}`
}

function signedRand(cents: number, compact = false): string {
  const sign = cents < 0 ? '−' : ''
  return `${sign}${formatRand(cents, compact)}`
}

export function InsightsClient({ data }: { data: AnalyticsOverview }) {
  const allYears = useMemo(() => data.yearTotals.map((y) => y.year).sort((a, b) => b - a), [data.yearTotals])
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all')

  // Filter monthly P&L by selected year
  const monthlyForChart = useMemo(() => {
    if (selectedYear === 'all') return data.monthlyPnL
    return data.monthlyPnL.filter((m) => m.yearMonth.startsWith(String(selectedYear)))
  }, [data.monthlyPnL, selectedYear])

  // For the bar chart we need a max scale
  const maxMonthly = useMemo(() => {
    let max = 0
    for (const m of monthlyForChart) {
      max = Math.max(max, m.revenueCents, Math.abs(m.expenseCents))
    }
    return max
  }, [monthlyForChart])

  // KPIs for selected year (or all-time)
  const kpis = useMemo(() => {
    if (selectedYear === 'all') return data.kpis
    const yr = data.yearTotals.find((y) => y.year === selectedYear)
    if (!yr) return data.kpis
    return {
      totalRevenueCents: yr.revenueCents,
      totalExpenseCents: yr.expenseCents,
      netCents: yr.netCents,
      transactionCount: yr.transactionCount,
      categorisedPct: data.kpis.categorisedPct,
      personalCount: data.kpis.personalCount,
    }
  }, [selectedYear, data])

  return (
    <div className="flex flex-col gap-5 px-[var(--page-gutter)] py-6">
      {/* Page head + year filter */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">Insights</h1>
          <p className="mt-1 text-[13px] text-[var(--color-ink-3)]">
            Financial overview across {data.yearTotals.length} year{data.yearTotals.length !== 1 ? 's' : ''} of bank data —
            {' '}{data.kpis.transactionCount.toLocaleString()} business transactions, {data.kpis.categorisedPct}% auto-categorised
          </p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <YearChip label="All time" active={selectedYear === 'all'} onClick={() => setSelectedYear('all')} />
          {allYears.map((y) => (
            <YearChip key={y} label={String(y)} active={selectedYear === y} onClick={() => setSelectedYear(y)} />
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Revenue"
          value={formatRand(kpis.totalRevenueCents, true)}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="positive"
        />
        <KpiCard
          label="Expenses"
          value={formatRand(kpis.totalExpenseCents, true)}
          icon={<TrendingDown className="h-4 w-4" />}
          tone="negative"
        />
        <KpiCard
          label="Net"
          value={signedRand(kpis.netCents, true)}
          icon={<Wallet className="h-4 w-4" />}
          tone={kpis.netCents >= 0 ? 'positive' : 'negative'}
        />
        <KpiCard
          label="Transactions"
          value={kpis.transactionCount.toLocaleString()}
          icon={<Receipt className="h-4 w-4" />}
          tone="neutral"
        />
      </div>

      {/* Monthly P&L chart */}
      <Section
        title={selectedYear === 'all' ? 'Monthly P&L (all months)' : `Monthly P&L — ${selectedYear}`}
        subtitle={`${monthlyForChart.length} months · green = revenue, red = expenses`}
      >
        {monthlyForChart.length === 0 ? (
          <EmptyState message="No transactions for this period." />
        ) : (
          <MonthlyChart months={monthlyForChart} maxValue={maxMonthly} />
        )}
      </Section>

      {/* Per-business breakdown */}
      {data.perBusiness.length > 0 && (
        <Section title="Per-business performance" subtitle={`${data.perBusiness.length} businesses with rule-linked transactions`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.perBusiness.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </Section>
      )}

      {/* Two-column layout for categories + suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Top spend categories" subtitle={`Top ${data.topCategories.length} by total spend`}>
          {data.topCategories.length === 0 ? (
            <EmptyState message="No categorised expenses yet." />
          ) : (
            <BarList items={data.topCategories.map((c) => ({
              id: c.id,
              name: c.name,
              value: c.totalCents,
              count: c.count,
            }))} />
          )}
        </Section>

        <Section title="Top suppliers" subtitle={`Top ${data.topSuppliers.length} by total spend`}>
          {data.topSuppliers.length === 0 ? (
            <EmptyState message="No supplier-linked expenses yet." />
          ) : (
            <BarList items={data.topSuppliers.map((s) => ({
              id: s.id,
              name: s.name,
              value: s.totalCents,
              count: s.count,
            }))} />
          )}
        </Section>
      </div>

      {/* Year-over-year comparison */}
      {data.yearTotals.length > 1 && (
        <Section title="Year-over-year" subtitle={`${data.yearTotals.length}-year revenue, expense, net trend`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.yearTotals.map((y) => (
              <YearCard key={y.year} year={y} />
            ))}
          </div>
        </Section>
      )}

      {data.kpis.personalCount > 0 && (
        <p className="text-[11.5px] text-[var(--color-ink-4)]">
          {data.kpis.personalCount.toLocaleString()} transaction{data.kpis.personalCount !== 1 ? 's' : ''} marked
          as personal — excluded from the totals above.
        </p>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function YearChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
        active
          ? 'bg-[var(--color-accent)] text-white'
          : 'border border-[var(--color-border)] text-[var(--color-ink-2)] hover:bg-[var(--color-panel-2)]'
      }`}
    >
      {label}
    </button>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="mb-3 flex flex-col">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12px] text-[var(--color-ink-3)]">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function KpiCard({ label, value, icon, tone }: {
  label: string; value: string; icon: React.ReactNode;
  tone: 'positive' | 'negative' | 'neutral'
}) {
  const accentColor = tone === 'positive' ? 'var(--color-pos)' : tone === 'negative' ? 'var(--color-neg)' : 'var(--color-ink-2)'
  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
      <div className="flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.04em] text-[var(--color-ink-3)]">
        <span style={{ color: accentColor }}>{icon}</span>
        {label}
      </div>
      <p className="mt-1.5 text-[20px] font-semibold tabular-nums tracking-[-0.01em]" style={{ color: accentColor }}>
        {value}
      </p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-[12px] text-[var(--color-ink-3)]">{message}</div>
  )
}

function MonthlyChart({ months, maxValue }: {
  months: Array<{ yearMonth: string; revenueCents: number; expenseCents: number; netCents: number }>;
  maxValue: number;
}) {
  if (maxValue === 0) return <EmptyState message="No data." />

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1.5 min-h-[160px]" style={{ minWidth: `${months.length * 36}px` }}>
        {months.map((m) => {
          const [yr, mn] = m.yearMonth.split('-')
          const revPct = (m.revenueCents / maxValue) * 100
          const expPct = (Math.abs(m.expenseCents) / maxValue) * 100
          const label = MONTH_LABELS[parseInt(mn, 10) - 1]
          const isJan = mn === '01'
          return (
            <div key={m.yearMonth} className="flex flex-col items-center gap-0.5" style={{ width: '34px' }}>
              <div className="flex h-[140px] w-full items-end gap-[2px]">
                <div
                  className="flex-1 rounded-t-[2px]"
                  style={{ height: `${revPct}%`, backgroundColor: 'var(--color-pos)' }}
                  title={`Revenue: ${formatRand(m.revenueCents, true)}`}
                />
                <div
                  className="flex-1 rounded-t-[2px]"
                  style={{ height: `${expPct}%`, backgroundColor: 'var(--color-neg)' }}
                  title={`Expense: ${formatRand(m.expenseCents, true)}`}
                />
              </div>
              <span className="text-[10px] tabular-nums text-[var(--color-ink-3)]">
                {label}{isJan && <><br/><span className="text-[9px]">{yr}</span></>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BarList({ items }: {
  items: Array<{ id: string; name: string; value: number; count: number }>
}) {
  const max = items[0]?.value ?? 1
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const pct = (item.value / max) * 100
        return (
          <div key={item.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="truncate text-[var(--color-ink)]">{item.name}</span>
              <span className="shrink-0 tabular-nums font-medium text-[var(--color-ink-2)]">
                {formatRand(item.value, true)}
                <span className="ml-1.5 text-[10.5px] text-[var(--color-ink-3)]">{item.count}×</span>
              </span>
            </div>
            <div className="h-[6px] w-full rounded-full bg-[var(--color-panel-2)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: 'var(--color-accent)' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BusinessCard({ business }: {
  business: { name: string; revenueCents: number; expenseCents: number; netCents: number; count: number }
}) {
  const isProfitable = business.netCents >= 0
  return (
    <div className="rounded-[10px] border border-[var(--color-border-2)] bg-[var(--color-panel-2)] p-3">
      <div className="flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.04em] text-[var(--color-ink-3)]">
        <Building2 className="h-3.5 w-3.5" />
        {business.name}
      </div>
      <p className="mt-2 text-[18px] font-semibold tabular-nums tracking-[-0.01em]"
         style={{ color: isProfitable ? 'var(--color-pos)' : 'var(--color-neg)' }}>
        {signedRand(business.netCents, true)}
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-1 text-[11px] text-[var(--color-ink-3)]">
        <span>Rev: <strong className="text-[var(--color-pos)]">{formatRand(business.revenueCents, true)}</strong></span>
        <span>Exp: <strong className="text-[var(--color-neg)]">{formatRand(business.expenseCents, true)}</strong></span>
        <span className="col-span-2">{business.count} txn{business.count !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

function YearCard({ year }: {
  year: { year: number; revenueCents: number; expenseCents: number; netCents: number; transactionCount: number }
}) {
  const isProfitable = year.netCents >= 0
  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
      <div className="flex items-center justify-between text-[11.5px] uppercase tracking-[0.04em] text-[var(--color-ink-3)]">
        <span className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" />{year.year}</span>
        <span>{year.transactionCount} txn</span>
      </div>
      <p className="mt-2 text-[18px] font-semibold tabular-nums tracking-[-0.01em]"
         style={{ color: isProfitable ? 'var(--color-pos)' : 'var(--color-neg)' }}>
        {signedRand(year.netCents, true)}
      </p>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--color-ink-3)]">
        <span>Rev <strong className="text-[var(--color-pos)]">{formatRand(year.revenueCents, true)}</strong></span>
        <span>Exp <strong className="text-[var(--color-neg)]">{formatRand(year.expenseCents, true)}</strong></span>
      </div>
    </div>
  )
}
