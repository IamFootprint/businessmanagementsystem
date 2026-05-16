'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Wallet, Receipt, Building2, BarChart3 } from 'lucide-react'
import type { AnalyticsOverview } from './page'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const BUSINESS_COLORS_HEX: Record<string, string> = {
  fastway: '#d97706',
  'opulent-beauty': '#db2777',
  'opulent-homeware': '#0891b2',
  'kgolaentle-holdings-group': '#7c3aed',
}

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

export function InsightsClient({ data, businessId, period }: {
  data: AnalyticsOverview
  businessId?: string
  period?: string
}) {
  const router = useRouter()
  const monthlyForChart = data.monthlyPnL
  const kpis = data.kpis

  // For the bar chart we need a max scale
  const maxMonthly = useMemo(() => {
    let max = 0
    for (const m of monthlyForChart) {
      max = Math.max(max, m.revenueCents, Math.abs(m.expenseCents))
    }
    return max
  }, [monthlyForChart])

  const setFilter = (next: { businessId?: string; period?: string }) => {
    const sp = new URLSearchParams()
    const b = next.businessId !== undefined ? next.businessId : businessId
    const p = next.period !== undefined ? next.period : period
    if (b) sp.set('businessId', b)
    if (p) sp.set('period', p)
    const s = sp.toString()
    router.push(s ? `?${s}` : '?')
  }

  const availableYears = useMemo(
    () => data.yearTotals.map((y) => y.year).sort((a, b) => b - a),
    [data.yearTotals]
  )

  const activeBiz = data.businesses.find((b) => b.id === businessId)
  const periodLabel =
    period === 'month' ? 'This month' :
    period === 'quarter' ? 'This quarter' :
    period === '6m' ? 'Last 6 months' :
    period === 'ytd' ? `YTD` :
    period && /^\d{4}$/.test(period) ? period : null
  const filterLabel = [activeBiz?.name ?? (businessId === 'unassigned' ? 'Unassigned' : null), periodLabel].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-5 px-[var(--page-gutter)] py-6">
      {/* Page head */}
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">Insights</h1>
        <p className="mt-1 text-[13px] text-[var(--color-ink-3)]">
          {filterLabel
            ? <>{filterLabel} · {data.kpis.transactionCount.toLocaleString()} transactions</>
            : <>Financial overview across {data.yearTotals.length} year{data.yearTotals.length !== 1 ? 's' : ''} of bank data — {data.kpis.transactionCount.toLocaleString()} business transactions, {data.kpis.categorisedPct}% auto-categorised</>
          }
        </p>
      </div>

      {/* Business unit filter */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--color-ink-3)]">Business unit</p>
        <div className="flex flex-wrap items-center gap-2">
          <YearChip label="All" active={!businessId} onClick={() => setFilter({ businessId: '' })} />
          {data.businesses.map((b) => (
            <YearChip
              key={b.id}
              label={b.name}
              active={businessId === b.id}
              onClick={() => setFilter({ businessId: b.id })}
              color={BUSINESS_COLORS_HEX[b.slug]}
            />
          ))}
          {data.unassignedCount > 0 && (
            <YearChip
              label={`Unassigned (${data.unassignedCount})`}
              active={businessId === 'unassigned'}
              onClick={() => setFilter({ businessId: 'unassigned' })}
            />
          )}
        </div>
      </div>

      {/* Period filter */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--color-ink-3)]">Period</p>
        <div className="flex flex-wrap items-center gap-2">
          <YearChip label="All time"      active={!period || period === 'all'} onClick={() => setFilter({ period: '' })} />
          <YearChip label="This month"    active={period === 'month'}           onClick={() => setFilter({ period: 'month' })} />
          <YearChip label="This quarter"  active={period === 'quarter'}         onClick={() => setFilter({ period: 'quarter' })} />
          <YearChip label="Last 6 months" active={period === '6m'}              onClick={() => setFilter({ period: '6m' })} />
          <YearChip label="YTD"           active={period === 'ytd'}             onClick={() => setFilter({ period: 'ytd' })} />
          {availableYears.map((y) => (
            <YearChip
              key={y}
              label={String(y)}
              active={period === String(y)}
              onClick={() => setFilter({ period: String(y) })}
            />
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

      {/* Cumulative net trend */}
      <Section
        title={filterLabel ? `Cumulative net — ${filterLabel}` : 'Cumulative net trend'}
        subtitle="How the business' net position has changed over time"
      >
        {monthlyForChart.length === 0 ? (
          <EmptyState message="No transactions for this period." />
        ) : (
          <CumulativeTrendChart months={monthlyForChart} />
        )}
      </Section>

      {/* Monthly P&L chart */}
      <Section
        title={filterLabel ? `Monthly P&L — ${filterLabel}` : 'Monthly P&L'}
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
        <>
          <Section
            title="Business mix"
            subtitle="Revenue and expense distribution across business units"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <BusinessDonut
                title="Revenue mix"
                subtitle={`Total R${(data.perBusiness.reduce((s, b) => s + b.revenueCents, 0) / 100).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`}
                items={data.perBusiness
                  .map((b) => ({ id: b.id, name: b.name, value: b.revenueCents }))
                  .filter((x) => x.value > 0)}
                positive
              />
              <BusinessDonut
                title="Expense mix"
                subtitle={`Total R${(Math.abs(data.perBusiness.reduce((s, b) => s + b.expenseCents, 0)) / 100).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`}
                items={data.perBusiness
                  .map((b) => ({ id: b.id, name: b.name, value: Math.abs(b.expenseCents) }))
                  .filter((x) => x.value > 0)}
                positive={false}
              />
            </div>
          </Section>
          <Section title="Per-business performance" subtitle={`${data.perBusiness.length} businesses with rule-linked transactions`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.perBusiness.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          </Section>
        </>
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
        <>
          <Section title="Year-over-year — revenue vs expenses" subtitle={`Grouped bar chart across ${data.yearTotals.length} years`}>
            <YearGroupedBars years={data.yearTotals} />
          </Section>
          <Section title="Yearly summary cards" subtitle={`${data.yearTotals.length}-year revenue, expense, net trend`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {data.yearTotals.map((y) => (
                <YearCard key={y.year} year={y} />
              ))}
            </div>
          </Section>
        </>
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

function YearChip({ label, active, onClick, color }: {
  label: string; active: boolean; onClick: () => void; color?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
        active ? 'text-white' : 'border border-[var(--color-border)] text-[var(--color-ink-2)] hover:bg-[var(--color-panel-2)]'
      }`}
      style={active ? { backgroundColor: color ?? 'var(--color-accent)' } : undefined}
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

// ─── New chart components ────────────────────────────────────────────────────

/**
 * Cumulative net trend — SVG line chart with shaded area, axis labels, and the
 * latest value annotation. Designed to be screenshot-friendly.
 */
function CumulativeTrendChart({ months }: {
  months: Array<{ yearMonth: string; netCents: number }>
}) {
  if (months.length < 2) return <EmptyState message="Need at least 2 months for a trend." />

  // Build cumulative series
  let cum = 0
  const points = months.map((m) => {
    cum += m.netCents
    return { ym: m.yearMonth, cum }
  })

  const minY = Math.min(0, ...points.map((p) => p.cum))
  const maxY = Math.max(0, ...points.map((p) => p.cum))
  const range = Math.max(1, maxY - minY)

  // SVG dims
  const W = 800
  const H = 220
  const padX = 40
  const padY = 24
  const innerW = W - padX * 2
  const innerH = H - padY * 2

  const xFor = (i: number) => padX + (i / (points.length - 1)) * innerW
  const yFor = (val: number) => padY + innerH - ((val - minY) / range) * innerH
  const zeroY = yFor(0)

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.cum)}`).join(' ')
  const areaPath = `${linePath} L ${xFor(points.length - 1)} ${zeroY} L ${xFor(0)} ${zeroY} Z`

  // Y-axis ticks (5)
  const tickValues = [0, 0.25, 0.5, 0.75, 1].map((t) => minY + t * range)

  // X-axis labels: pick ~6 across
  const labelEvery = Math.max(1, Math.floor(points.length / 6))
  const finalNet = points[points.length - 1].cum
  const finalIsPositive = finalNet >= 0

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: '320px', maxHeight: '260px' }}
        preserveAspectRatio="xMinYMid meet"
        role="img"
        aria-label="Cumulative net trend line"
      >
        <defs>
          <linearGradient id="trendAreaPositive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-pos)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-pos)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="trendAreaNegative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-neg)" stopOpacity="0.02" />
            <stop offset="100%" stopColor="var(--color-neg)" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Y-grid lines + labels */}
        {tickValues.map((tv, i) => (
          <g key={i}>
            <line
              x1={padX}
              x2={W - padX}
              y1={yFor(tv)}
              y2={yFor(tv)}
              stroke="var(--color-border)"
              strokeDasharray="2 4"
            />
            <text
              x={padX - 6}
              y={yFor(tv)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="10"
              fill="var(--color-ink-3)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {signedRand(tv, true)}
            </text>
          </g>
        ))}

        {/* Zero baseline (emphasised if not at boundary) */}
        {minY < 0 && maxY > 0 && (
          <line
            x1={padX}
            x2={W - padX}
            y1={zeroY}
            y2={zeroY}
            stroke="var(--color-ink-3)"
            strokeWidth="1"
          />
        )}

        {/* Area fill */}
        <path d={areaPath} fill={finalIsPositive ? 'url(#trendAreaPositive)' : 'url(#trendAreaNegative)'} />

        {/* Trend line */}
        <path
          d={linePath}
          fill="none"
          stroke={finalIsPositive ? 'var(--color-pos)' : 'var(--color-neg)'}
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* End-point marker */}
        <circle
          cx={xFor(points.length - 1)}
          cy={yFor(finalNet)}
          r="4"
          fill={finalIsPositive ? 'var(--color-pos)' : 'var(--color-neg)'}
          stroke="var(--color-panel)"
          strokeWidth="2"
        />

        {/* X-axis labels */}
        {points.map((p, i) => {
          if (i % labelEvery !== 0 && i !== points.length - 1) return null
          const [yr, mn] = p.ym.split('-')
          return (
            <text
              key={p.ym}
              x={xFor(i)}
              y={H - 4}
              textAnchor="middle"
              fontSize="9.5"
              fill="var(--color-ink-3)"
            >
              {MONTH_LABELS[parseInt(mn, 10) - 1]} {yr.slice(2)}
            </text>
          )
        })}
      </svg>

      {/* Latest value chip */}
      <div className="mt-2 flex items-center justify-between text-[11.5px] text-[var(--color-ink-3)]">
        <span>From {formatYearMonth(points[0].ym)}</span>
        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: finalIsPositive ? 'color-mix(in srgb, var(--color-pos) 12%, transparent)' : 'color-mix(in srgb, var(--color-neg) 12%, transparent)',
                color: finalIsPositive ? 'var(--color-pos)' : 'var(--color-neg)',
              }}>
          Cumulative net: {signedRand(finalNet, true)}
        </span>
        <span>To {formatYearMonth(points[points.length - 1].ym)}</span>
      </div>
    </div>
  )
}

function formatYearMonth(ym: string): string {
  const [yr, mn] = ym.split('-')
  return `${MONTH_LABELS[parseInt(mn, 10) - 1]} ${yr}`
}

/**
 * Donut/pie chart — designed to show business splits.
 * Renders inline legend with percentages. Screenshot-friendly: includes total in center.
 */
const BUSINESS_PALETTE: Record<string, string> = {
  // Slug or name keyed colours. Falls back to indexed palette.
  fastway: '#d97706',
  'opulent-beauty': '#db2777',
  'opulent-homeware': '#0891b2',
  'kgolaentle-holdings-group': '#7c3aed',
}
const FALLBACK_PALETTE = ['#d97706', '#db2777', '#0891b2', '#7c3aed', '#16a34a', '#dc2626']

function BusinessDonut({ title, subtitle, items, positive }: {
  title: string
  subtitle: string
  items: Array<{ id: string; name: string; value: number }>
  positive: boolean
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-[10px] border border-[var(--color-border-2)] bg-[var(--color-panel-2)] p-4">
        <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">{title}</h3>
        <EmptyState message={`No ${positive ? 'revenue' : 'expenses'} attributed to a business yet.`} />
      </div>
    )
  }

  const total = items.reduce((s, x) => s + x.value, 0)
  const sorted = [...items].sort((a, b) => b.value - a.value)

  // SVG donut
  const size = 160
  const cx = size / 2
  const cy = size / 2
  const outerR = 70
  const innerR = 46

  // If only one slice, we render a single ring (avoid path arc weirdness)
  let cumPct = 0
  const slices = sorted.map((item, idx) => {
    const pct = item.value / total
    const startAngle = cumPct * 2 * Math.PI - Math.PI / 2
    cumPct += pct
    const endAngle = cumPct * 2 * Math.PI - Math.PI / 2

    const color = BUSINESS_PALETTE[item.id]
      ?? BUSINESS_PALETTE[item.name.toLowerCase().replace(/[^a-z]/g, '-')]
      ?? FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length]

    const isFullCircle = items.length === 1
    let path: string
    if (isFullCircle) {
      // Two arcs make a full donut
      path = `
        M ${cx - outerR} ${cy}
        A ${outerR} ${outerR} 0 1 1 ${cx + outerR} ${cy}
        A ${outerR} ${outerR} 0 1 1 ${cx - outerR} ${cy}
        Z
        M ${cx - innerR} ${cy}
        A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy}
        A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy}
        Z
      `
    } else {
      const x1Out = cx + outerR * Math.cos(startAngle)
      const y1Out = cy + outerR * Math.sin(startAngle)
      const x2Out = cx + outerR * Math.cos(endAngle)
      const y2Out = cy + outerR * Math.sin(endAngle)
      const x1In = cx + innerR * Math.cos(endAngle)
      const y1In = cy + innerR * Math.sin(endAngle)
      const x2In = cx + innerR * Math.cos(startAngle)
      const y2In = cy + innerR * Math.sin(startAngle)
      const largeArc = pct > 0.5 ? 1 : 0
      path = `
        M ${x1Out} ${y1Out}
        A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Out} ${y2Out}
        L ${x1In} ${y1In}
        A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2In} ${y2In}
        Z
      `
    }

    return { path, color, pct, ...item }
  })

  return (
    <div className="rounded-[10px] border border-[var(--color-border-2)] bg-[var(--color-panel-2)] p-4">
      <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">{title}</h3>
      <p className="mt-0.5 text-[11.5px] text-[var(--color-ink-3)]">{subtitle}</p>

      <div className="mt-3 flex items-center gap-4">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="shrink-0" role="img" aria-label={`${title} donut chart`}>
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} fillRule="evenodd" />
          ))}
          {/* Centre total */}
          <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="var(--color-ink-3)">
            Total
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="600"
                fill={positive ? 'var(--color-pos)' : 'var(--color-neg)'}
                style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatRand(total, true)}
          </text>
        </svg>

        <div className="flex flex-1 flex-col gap-1.5">
          {slices.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="truncate text-[12px] text-[var(--color-ink)]">{s.name}</span>
              </div>
              <span className="shrink-0 text-[11px] font-medium tabular-nums text-[var(--color-ink-2)]">
                {(s.pct * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Year-over-year grouped bar chart — revenue + expense bars side by side per year.
 */
function YearGroupedBars({ years }: {
  years: Array<{ year: number; revenueCents: number; expenseCents: number; netCents: number }>
}) {
  if (years.length === 0) return <EmptyState message="No years to compare." />

  const maxValue = Math.max(
    ...years.flatMap((y) => [y.revenueCents, Math.abs(y.expenseCents)])
  )
  if (maxValue === 0) return <EmptyState message="No values." />

  const W = 700
  const H = 240
  const padX = 50
  const padTop = 12
  const padBottom = 38
  const innerW = W - padX * 2
  const innerH = H - padTop - padBottom

  const groupWidth = innerW / years.length
  const barWidth = Math.min(28, (groupWidth - 12) / 2)
  const yFor = (val: number) => padTop + innerH - (val / maxValue) * innerH

  // Y ticks
  const tickValues = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxValue)

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: '320px', maxHeight: '260px' }}
        preserveAspectRatio="xMinYMid meet"
        role="img"
        aria-label="Year-over-year revenue vs expense"
      >
        {/* Gridlines + Y labels */}
        {tickValues.map((tv, i) => (
          <g key={i}>
            <line
              x1={padX}
              x2={W - padX}
              y1={yFor(tv)}
              y2={yFor(tv)}
              stroke="var(--color-border)"
              strokeDasharray="2 4"
            />
            <text
              x={padX - 6}
              y={yFor(tv)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="10"
              fill="var(--color-ink-3)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatRand(tv, true)}
            </text>
          </g>
        ))}

        {/* Bars */}
        {years.map((y, idx) => {
          const groupCx = padX + groupWidth * idx + groupWidth / 2
          const revX = groupCx - barWidth - 2
          const expX = groupCx + 2
          const revH = (y.revenueCents / maxValue) * innerH
          const expH = (Math.abs(y.expenseCents) / maxValue) * innerH
          const baseY = padTop + innerH
          const isProfit = y.netCents >= 0
          return (
            <g key={y.year}>
              {/* Revenue bar */}
              <rect
                x={revX}
                y={baseY - revH}
                width={barWidth}
                height={revH}
                fill="var(--color-pos)"
                rx="2"
              />
              <text
                x={revX + barWidth / 2}
                y={baseY - revH - 4}
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-pos)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatRand(y.revenueCents, true)}
              </text>

              {/* Expense bar */}
              <rect
                x={expX}
                y={baseY - expH}
                width={barWidth}
                height={expH}
                fill="var(--color-neg)"
                rx="2"
              />
              <text
                x={expX + barWidth / 2}
                y={baseY - expH - 4}
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-neg)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatRand(y.expenseCents, true)}
              </text>

              {/* X label: year + net */}
              <text
                x={groupCx}
                y={baseY + 14}
                textAnchor="middle"
                fontSize="11"
                fontWeight="500"
                fill="var(--color-ink)"
              >
                {y.year}
              </text>
              <text
                x={groupCx}
                y={baseY + 26}
                textAnchor="middle"
                fontSize="9"
                fill={isProfit ? 'var(--color-pos)' : 'var(--color-neg)'}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                Net {signedRand(y.netCents, true)}
              </text>
            </g>
          )
        })}

        {/* Legend */}
        <g transform={`translate(${padX}, ${padTop - 6})`}>
          <rect x="0" y="-4" width="10" height="10" fill="var(--color-pos)" rx="2" />
          <text x="14" y="4" fontSize="10" fill="var(--color-ink-2)">Revenue</text>
          <rect x="78" y="-4" width="10" height="10" fill="var(--color-neg)" rx="2" />
          <text x="92" y="4" fontSize="10" fill="var(--color-ink-2)">Expense</text>
        </g>
      </svg>
    </div>
  )
}
