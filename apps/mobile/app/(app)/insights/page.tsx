import Link from 'next/link'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { TrendingUp, TrendingDown, Wallet, Receipt, AlertCircle, Building2, BarChart3 } from 'lucide-react'

type AnalyticsOverview = {
  kpis: {
    totalRevenueCents: number
    totalExpenseCents: number
    netCents: number
    transactionCount: number
    categorisedPct: number
    personalCount: number
  }
  monthlyPnL: Array<{
    yearMonth: string
    revenueCents: number
    expenseCents: number
    netCents: number
    transactionCount: number
  }>
  topCategories: Array<{ id: string; name: string; type: string; totalCents: number; count: number }>
  topSuppliers: Array<{ id: string; name: string; totalCents: number; count: number }>
  perBusiness: Array<{
    id: string; slug: string; name: string
    revenueCents: number; expenseCents: number; netCents: number; count: number
  }>
  yearTotals: Array<{
    year: number; revenueCents: number; expenseCents: number; netCents: number; transactionCount: number
  }>
  businesses: Array<{ id: string; slug: string; name: string }>
  filter: { businessId: string | null }
  unassignedCount: number
  unassignedBreakdown?: {
    totalCount: number
    debits: { label: string; count: number; totalCents: number; topSamples: string[] }
    credits: {
      cashDeposits: { label: string; count: number; totalCents: number; topSamples: string[] }
      eftIn: { label: string; count: number; totalCents: number; topSamples: string[] }
      payShapIn: { label: string; count: number; totalCents: number; topSamples: string[] }
      capitalInternal: { label: string; count: number; totalCents: number; topSamples: string[] }
      magtapePos: { label: string; count: number; totalCents: number; topSamples: string[] }
      reversals: { label: string; count: number; totalCents: number; topSamples: string[] }
      other: { label: string; count: number; totalCents: number; topSamples: string[] }
    }
  }
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatRand(cents: number, compact = false): string {
  const r = Math.round(Math.abs(cents) / 100)
  if (compact && r >= 1_000_000) return `R${(r / 1_000_000).toFixed(1)}M`
  if (compact && r >= 1_000) return `R${(r / 1_000).toFixed(0)}k`
  return `R${r.toLocaleString('en-ZA')}`
}
function signedRand(cents: number, compact = false): string {
  return `${cents < 0 ? '−' : ''}${formatRand(cents, compact)}`
}

const BUSINESS_COLORS: Record<string, string> = {
  fastway: '#d97706',
  'opulent-beauty': '#db2777',
  'opulent-homeware': '#0891b2',
  'kgolaentle-holdings-group': '#7c3aed',
}
const FALLBACK = ['#d97706','#db2777','#0891b2','#7c3aed','#16a34a','#dc2626']

// ─── Period presets ──────────────────────────────────────────────────────────

type PeriodKey = 'all' | 'month' | 'quarter' | '6m' | 'ytd' | string // string = year e.g. "2025"

function computePeriodRange(period: string | undefined, now = new Date()): { from?: string; to?: string; label: string } {
  if (!period || period === 'all') return { label: 'All time' }

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  if (period === 'month') {
    const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    return { from: fmt(from), to: fmt(today), label: 'This month' }
  }
  if (period === 'quarter') {
    const qStartMonth = Math.floor(today.getUTCMonth() / 3) * 3
    const from = new Date(Date.UTC(today.getUTCFullYear(), qStartMonth, 1))
    return { from: fmt(from), to: fmt(today), label: 'This quarter' }
  }
  if (period === '6m') {
    const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1))
    return { from: fmt(from), to: fmt(today), label: 'Last 6 months' }
  }
  if (period === 'ytd') {
    const from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1))
    return { from: fmt(from), to: fmt(today), label: `YTD ${today.getUTCFullYear()}` }
  }
  // Year-specific: "2024", "2023", etc.
  if (/^\d{4}$/.test(period)) {
    const yr = parseInt(period, 10)
    return {
      from: `${yr}-01-01`,
      to: `${yr}-12-31`,
      label: String(yr),
    }
  }
  return { label: 'All time' }
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string; period?: string }>
}) {
  const { businessId, period } = await searchParams
  const periodInfo = computePeriodRange(period)

  // Build the analytics request URL
  const qs = new URLSearchParams()
  if (businessId) qs.set('businessId', businessId)
  if (periodInfo.from) qs.set('from', periodInfo.from)
  if (periodInfo.to) qs.set('to', periodInfo.to)
  const apiPath = qs.toString() ? `/analytics/overview?${qs}` : '/analytics/overview'

  let data: AnalyticsOverview | null = null
  let error: string | null = null

  try {
    data = await apiRequestAuthenticated<AnalyticsOverview>(apiPath)
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load analytics'
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <AlertCircle size={32} style={{ color: 'var(--color-bad)' }} />
        <p className="text-[14px]" style={{ color: 'var(--color-ink-3)' }}>{error ?? 'No data'}</p>
      </div>
    )
  }

  // Derive available year chips from data
  const availableYears = data.yearTotals.map((y) => y.year).sort((a, b) => b - a)

  // Build chip helper that preserves the OTHER filter when toggling
  const chipHref = (params: { businessId?: string; period?: string }) => {
    const next = new URLSearchParams()
    const b = params.businessId !== undefined ? params.businessId : businessId
    const p = params.period !== undefined ? params.period : period
    if (b) next.set('businessId', b)
    if (p) next.set('period', p)
    const s = next.toString()
    return s ? `?${s}` : '?'
  }

  const kpis = data.kpis
  const months = data.monthlyPnL
  const maxMonthly = months.length === 0 ? 0 : Math.max(
    ...months.flatMap((m) => [m.revenueCents, Math.abs(m.expenseCents)])
  )

  // Build cumulative net
  let cum = 0
  const cumPoints = months.map((m) => ({ ym: m.yearMonth, cum: cum += m.netCents }))

  const totalRev = data.perBusiness.reduce((s, b) => s + b.revenueCents, 0)
  const totalExp = Math.abs(data.perBusiness.reduce((s, b) => s + b.expenseCents, 0))

  // Build subtitle reflecting active filters
  const activeBiz = data.businesses.find((b) => b.id === businessId)
  const filterLabel = [
    activeBiz?.name ?? (businessId === 'unassigned' ? 'Unassigned' : null),
    periodInfo.label !== 'All time' ? periodInfo.label : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-5">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--color-ink)' }}>
          Insights
        </h1>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
          {filterLabel
            ? <>{filterLabel} · {kpis.transactionCount.toLocaleString()} txns</>
            : <>{kpis.transactionCount.toLocaleString()} business txns · {kpis.categorisedPct}% auto-categorised · {data.yearTotals.length} years</>
          }
        </p>
      </div>

      {/* Business filter */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--color-ink-3)' }}>
          Business unit
        </p>
        <div className="flex gap-1.5 overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip
            href={chipHref({ businessId: '' })}
            active={!businessId}
            label="All"
          />
          {data.businesses.map((b) => (
            <FilterChip
              key={b.id}
              href={chipHref({ businessId: b.id })}
              active={businessId === b.id}
              label={b.name}
              color={BUSINESS_COLORS[b.slug]}
            />
          ))}
          {data.unassignedCount > 0 && (
            <FilterChip
              href={chipHref({ businessId: 'unassigned' })}
              active={businessId === 'unassigned'}
              label={`Unassigned (${data.unassignedCount})`}
            />
          )}
        </div>
      </div>

      {/* Period filter */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--color-ink-3)' }}>
          Period
        </p>
        <div className="flex gap-1.5 overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip href={chipHref({ period: '' })}        active={!period || period === 'all'} label="All time" />
          <FilterChip href={chipHref({ period: 'month' })}   active={period === 'month'}          label="This month" />
          <FilterChip href={chipHref({ period: 'quarter' })} active={period === 'quarter'}        label="This quarter" />
          <FilterChip href={chipHref({ period: '6m' })}      active={period === '6m'}             label="Last 6 mo" />
          <FilterChip href={chipHref({ period: 'ytd' })}     active={period === 'ytd'}            label="YTD" />
          {availableYears.map((y) => (
            <FilterChip
              key={y}
              href={chipHref({ period: String(y) })}
              active={period === String(y)}
              label={String(y)}
            />
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5">
        <KpiCard icon={<TrendingUp size={13} />} label="Revenue" value={formatRand(kpis.totalRevenueCents, true)} color="var(--color-pos)" />
        <KpiCard icon={<TrendingDown size={13} />} label="Expenses" value={formatRand(kpis.totalExpenseCents, true)} color="var(--color-neg)" />
        <KpiCard icon={<Wallet size={13} />} label="Net" value={signedRand(kpis.netCents, true)} color={kpis.netCents >= 0 ? 'var(--color-pos)' : 'var(--color-neg)'} />
        <KpiCard icon={<Receipt size={13} />} label="Transactions" value={kpis.transactionCount.toLocaleString()} color="var(--color-ink)" />
      </div>

      {/* Cumulative trend */}
      <Card title="Cumulative net trend" subtitle="How the business position has evolved">
        {cumPoints.length < 2 ? (
          <EmptyState message="Need ≥2 months" />
        ) : (
          <CumulativeTrend points={cumPoints} />
        )}
      </Card>

      {/* Monthly P&L bars */}
      <Card title="Monthly P&L" subtitle={`${months.length} months · green = revenue, red = expenses`}>
        {months.length === 0 ? <EmptyState message="No transactions yet." /> : (
          <MonthlyBars months={months} maxValue={maxMonthly} />
        )}
      </Card>

      {/* Per-business mix */}
      {data.perBusiness.length > 0 && (
        <Card title="Business mix" subtitle="Revenue & expense distribution">
          <div className="flex flex-col gap-4">
            <BusinessDonut
              title="Revenue mix"
              total={totalRev}
              items={data.perBusiness.map((b) => ({ id: b.id, slug: b.slug, name: b.name, value: b.revenueCents })).filter((x) => x.value > 0)}
              positive
            />
            <BusinessDonut
              title="Expense mix"
              total={totalExp}
              items={data.perBusiness.map((b) => ({ id: b.id, slug: b.slug, name: b.name, value: Math.abs(b.expenseCents) })).filter((x) => x.value > 0)}
              positive={false}
            />
          </div>
        </Card>
      )}

      {/* Per-business cards */}
      {data.perBusiness.length > 0 && (
        <Card title="Per-business performance" subtitle={`${data.perBusiness.length} rule-linked businesses`}>
          <div className="flex flex-col gap-2">
            {data.perBusiness.map((b) => (
              <BusinessRow key={b.id} biz={b} />
            ))}
          </div>
        </Card>
      )}

      {/* Top categories */}
      {data.topCategories.length > 0 && (
        <Card title="Top spend categories" subtitle={`Top ${data.topCategories.length} by total`}>
          <BarList items={data.topCategories.map((c) => ({ id: c.id, name: c.name, value: c.totalCents, count: c.count }))} />
        </Card>
      )}

      {/* Top suppliers */}
      {data.topSuppliers.length > 0 && (
        <Card title="Top suppliers" subtitle={`Top ${data.topSuppliers.length} by spend`}>
          <BarList items={data.topSuppliers.map((s) => ({ id: s.id, name: s.name, value: s.totalCents, count: s.count }))} />
        </Card>
      )}

      {/* Unassigned breakdown — only show on the unassigned filter */}
      {businessId === 'unassigned' && data.unassignedBreakdown && (
        <Card
          title="Unassigned breakdown"
          subtitle={`${data.unassignedBreakdown.totalCount.toLocaleString()} transactions not yet attributed to a business`}
        >
          <UnassignedBreakdown b={data.unassignedBreakdown} />
        </Card>
      )}

      {/* Year-over-year */}
      {data.yearTotals.length > 1 && (
        <Card title="Year-over-year" subtitle={`${data.yearTotals.length}-year comparison`}>
          <YearGroupedBars years={data.yearTotals} />
          <div className="mt-3 flex flex-col gap-2">
            {data.yearTotals.map((y) => (
              <YearRow key={y.year} year={y} />
            ))}
          </div>
        </Card>
      )}

      {kpis.personalCount > 0 && (
        <p className="px-1 text-[11px]" style={{ color: 'var(--color-ink-4)' }}>
          {kpis.personalCount.toLocaleString()} transaction{kpis.personalCount !== 1 ? 's' : ''} marked personal — excluded from totals.
        </p>
      )}
    </div>
  )
}

// ─── Components ──────────────────────────────────────────────────────────

function FilterChip({ href, active, label, color }: { href: string; active: boolean; label: string; color?: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      className="shrink-0 rounded-pill px-3 py-1.5 text-[12px] font-medium transition-colors active:opacity-70"
      style={
        active
          ? { background: color ?? 'var(--color-accent)', color: 'var(--color-accent-fg, #fff)', border: 'none' }
          : { background: 'var(--color-surface-2)', color: 'var(--color-ink-2)', border: '1px solid var(--color-border)' }
      }
    >
      {label}
    </Link>
  )
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="card rounded-xl p-3" style={{ background: 'var(--color-surface)' }}>
      <div className="flex items-center gap-1 text-[10.5px] uppercase tracking-[.06em]" style={{ color: 'var(--color-ink-3)' }}>
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-[18px] font-semibold tabular-nums tracking-[-0.01em]" style={{ color, fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
    </div>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card rounded-xl p-4" style={{ background: 'var(--color-surface)' }}>
      <h2 className="text-[13px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--color-ink)' }}>{title}</h2>
      {subtitle && <p className="mt-0.5 text-[11px]" style={{ color: 'var(--color-ink-3)' }}>{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-6 text-center text-[12px]" style={{ color: 'var(--color-ink-3)' }}>{message}</p>
}

function MonthlyBars({ months, maxValue }: {
  months: Array<{ yearMonth: string; revenueCents: number; expenseCents: number }>; maxValue: number
}) {
  if (maxValue === 0) return <EmptyState message="No values." />
  return (
    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="flex items-end gap-1.5" style={{ minWidth: `${months.length * 32}px`, height: '140px' }}>
        {months.map((m) => {
          const [yr, mn] = m.yearMonth.split('-')
          const revPct = (m.revenueCents / maxValue) * 100
          const expPct = (Math.abs(m.expenseCents) / maxValue) * 100
          const isJan = mn === '01'
          return (
            <div key={m.yearMonth} className="flex flex-col items-center gap-0.5" style={{ width: '30px' }}>
              <div className="flex h-[110px] w-full items-end gap-[2px]">
                <div className="flex-1 rounded-t-[2px]" style={{ height: `${revPct}%`, background: 'var(--color-pos)' }} />
                <div className="flex-1 rounded-t-[2px]" style={{ height: `${expPct}%`, background: 'var(--color-neg)' }} />
              </div>
              <span className="text-[9px] tabular-nums" style={{ color: 'var(--color-ink-3)' }}>
                {MONTH_LABELS[parseInt(mn, 10) - 1]}{isJan && <><br/>{yr.slice(2)}</>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CumulativeTrend({ points }: { points: Array<{ ym: string; cum: number }> }) {
  const minY = Math.min(0, ...points.map((p) => p.cum))
  const maxY = Math.max(0, ...points.map((p) => p.cum))
  const range = Math.max(1, maxY - minY)

  const W = 320, H = 140, padX = 30, padY = 12
  const innerW = W - padX * 2, innerH = H - padY * 2
  const xFor = (i: number) => padX + (i / (points.length - 1)) * innerW
  const yFor = (v: number) => padY + innerH - ((v - minY) / range) * innerH
  const zeroY = yFor(0)

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.cum)}`).join(' ')
  const area = `${line} L ${xFor(points.length - 1)} ${zeroY} L ${xFor(0)} ${zeroY} Z`
  const finalNet = points[points.length - 1].cum
  const isPositive = finalNet >= 0

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }} preserveAspectRatio="xMinYMid meet">
        <defs>
          <linearGradient id="trendPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-pos)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-pos)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="trendNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-neg)" stopOpacity="0.02" />
            <stop offset="100%" stopColor="var(--color-neg)" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        {minY < 0 && maxY > 0 && (
          <line x1={padX} x2={W - padX} y1={zeroY} y2={zeroY} stroke="var(--color-ink-3)" strokeWidth="0.6" />
        )}
        <path d={area} fill={isPositive ? 'url(#trendPos)' : 'url(#trendNeg)'} />
        <path d={line} fill="none" stroke={isPositive ? 'var(--color-pos)' : 'var(--color-neg)'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={xFor(points.length - 1)} cy={yFor(finalNet)} r="3.5" fill={isPositive ? 'var(--color-pos)' : 'var(--color-neg)'} stroke="var(--color-surface)" strokeWidth="2" />
        <text x={padX} y={H - 1} fontSize="9" fill="var(--color-ink-3)">{formatYM(points[0].ym)}</text>
        <text x={W - padX} y={H - 1} fontSize="9" fill="var(--color-ink-3)" textAnchor="end">{formatYM(points[points.length - 1].ym)}</text>
      </svg>
      <div className="mt-2 flex justify-center">
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium tabular-nums"
              style={{
                background: isPositive ? 'color-mix(in srgb, var(--color-pos) 14%, transparent)' : 'color-mix(in srgb, var(--color-neg) 14%, transparent)',
                color: isPositive ? 'var(--color-pos)' : 'var(--color-neg)',
              }}>
          Cumulative net: {signedRand(finalNet, true)}
        </span>
      </div>
    </div>
  )
}

function formatYM(ym: string): string {
  const [yr, mn] = ym.split('-')
  return `${MONTH_LABELS[parseInt(mn, 10) - 1]} ${yr.slice(2)}`
}

function BusinessDonut({ title, total, items, positive }: {
  title: string; total: number;
  items: Array<{ id: string; slug: string; name: string; value: number }>;
  positive: boolean
}) {
  if (items.length === 0 || total === 0) return null
  const sorted = [...items].sort((a, b) => b.value - a.value)
  const size = 130, cx = size / 2, cy = size / 2, outerR = 56, innerR = 36

  let cumPct = 0
  const slices = sorted.map((item, idx) => {
    const pct = item.value / total
    const start = cumPct * 2 * Math.PI - Math.PI / 2
    cumPct += pct
    const end = cumPct * 2 * Math.PI - Math.PI / 2
    const color = BUSINESS_COLORS[item.slug] ?? FALLBACK[idx % FALLBACK.length]
    let path: string
    if (items.length === 1) {
      path = `M ${cx - outerR} ${cy} A ${outerR} ${outerR} 0 1 1 ${cx + outerR} ${cy} A ${outerR} ${outerR} 0 1 1 ${cx - outerR} ${cy} Z M ${cx - innerR} ${cy} A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy} A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy} Z`
    } else {
      const x1Out = cx + outerR * Math.cos(start), y1Out = cy + outerR * Math.sin(start)
      const x2Out = cx + outerR * Math.cos(end), y2Out = cy + outerR * Math.sin(end)
      const x1In = cx + innerR * Math.cos(end), y1In = cy + innerR * Math.sin(end)
      const x2In = cx + innerR * Math.cos(start), y2In = cy + innerR * Math.sin(start)
      const largeArc = pct > 0.5 ? 1 : 0
      path = `M ${x1Out} ${y1Out} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Out} ${y2Out} L ${x1In} ${y1In} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2In} ${y2In} Z`
    }
    return { path, color, pct, ...item }
  })

  return (
    <div>
      <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[.04em]" style={{ color: 'var(--color-ink-3)' }}>{title}</p>
      <div className="flex items-center gap-3">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="shrink-0">
          {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} fillRule="evenodd" />)}
          <text x={cx} y={cy - 3} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="var(--color-ink-3)">Total</text>
          <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="600"
                fill={positive ? 'var(--color-pos)' : 'var(--color-neg)'} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatRand(total, true)}
          </text>
        </svg>
        <div className="flex flex-1 flex-col gap-1.5">
          {slices.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="truncate text-[11.5px]" style={{ color: 'var(--color-ink)' }}>{s.name}</span>
              </div>
              <span className="shrink-0 text-[10.5px] font-medium tabular-nums" style={{ color: 'var(--color-ink-2)' }}>{(s.pct * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BusinessRow({ biz }: { biz: { name: string; slug: string; revenueCents: number; expenseCents: number; netCents: number; count: number } }) {
  const isProfit = biz.netCents >= 0
  const color = BUSINESS_COLORS[biz.slug] ?? 'var(--color-accent)'
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={14} style={{ color }} />
          <span className="text-[12.5px] font-medium" style={{ color: 'var(--color-ink)' }}>{biz.name}</span>
        </div>
        <span className="text-[14px] font-semibold tabular-nums" style={{ color: isProfit ? 'var(--color-pos)' : 'var(--color-neg)', fontFamily: 'var(--font-display)' }}>
          {signedRand(biz.netCents, true)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10.5px]" style={{ color: 'var(--color-ink-3)' }}>
        <span>Rev <strong style={{ color: 'var(--color-pos)' }}>{formatRand(biz.revenueCents, true)}</strong></span>
        <span>Exp <strong style={{ color: 'var(--color-neg)' }}>{formatRand(biz.expenseCents, true)}</strong></span>
        <span>{biz.count} txn</span>
      </div>
    </div>
  )
}

function BarList({ items }: { items: Array<{ id: string; name: string; value: number; count: number }> }) {
  const max = items[0]?.value ?? 1
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const pct = (item.value / max) * 100
        return (
          <div key={item.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[12px]">
              <span className="truncate" style={{ color: 'var(--color-ink)' }}>{item.name}</span>
              <span className="shrink-0 tabular-nums font-medium" style={{ color: 'var(--color-ink-2)' }}>
                {formatRand(item.value, true)} <span className="text-[10px]" style={{ color: 'var(--color-ink-3)' }}>{item.count}×</span>
              </span>
            </div>
            <div className="h-[5px] w-full rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
              <div className="h-full" style={{ width: `${pct}%`, background: 'var(--color-accent)' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function UnassignedBreakdown({ b }: {
  b: NonNullable<AnalyticsOverview['unassignedBreakdown']>
}) {
  const debitRow = b.debits
  const creditRows = [
    { key: 'cashDeposits', ...b.credits.cashDeposits, accent: 'var(--color-pos)' },
    { key: 'eftIn', ...b.credits.eftIn },
    { key: 'payShapIn', ...b.credits.payShapIn },
    { key: 'capitalInternal', ...b.credits.capitalInternal },
    { key: 'magtapePos', ...b.credits.magtapePos },
    { key: 'reversals', ...b.credits.reversals },
    { key: 'other', ...b.credits.other },
  ].filter((r) => r.count > 0)
  const totalCreditCount = creditRows.reduce((s, r) => s + r.count, 0)
  const totalCreditCents = creditRows.reduce((s, r) => s + r.totalCents, 0)

  return (
    <div className="flex flex-col gap-3">
      {/* Debits */}
      <div className="rounded-lg p-3" style={{ background: 'color-mix(in srgb, var(--color-neg) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-neg) 24%, transparent)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-[.06em]" style={{ color: 'var(--color-neg)' }}>
            Debits
          </span>
          <span className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>{debitRow.count.toLocaleString()} txns</span>
        </div>
        <p className="mt-1 text-[18px] font-semibold tabular-nums" style={{ color: 'var(--color-neg)', fontFamily: 'var(--font-display)' }}>
          {signedRand(debitRow.totalCents, true)}
        </p>
      </div>

      {/* Credits total */}
      <div className="rounded-lg p-3" style={{ background: 'color-mix(in srgb, var(--color-pos) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-pos) 24%, transparent)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-[.06em]" style={{ color: 'var(--color-pos)' }}>
            Credits
          </span>
          <span className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>{totalCreditCount.toLocaleString()} txns</span>
        </div>
        <p className="mt-1 text-[18px] font-semibold tabular-nums" style={{ color: 'var(--color-pos)', fontFamily: 'var(--font-display)' }}>
          {signedRand(totalCreditCents, true)}
        </p>

        {/* Credit sub-breakdown */}
        <div className="mt-3 flex flex-col gap-2">
          {creditRows.map((r) => {
            const pct = totalCreditCents > 0 ? (r.totalCents / totalCreditCents) * 100 : 0
            const isCash = r.key === 'cashDeposits'
            return (
              <div key={r.key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className={isCash ? 'font-medium' : ''} style={{ color: isCash ? 'var(--color-pos)' : 'var(--color-ink)' }}>
                    {r.label}{isCash && ' ★'}
                  </span>
                  <span className="shrink-0 tabular-nums font-medium" style={{ color: 'var(--color-ink-2)' }}>
                    {formatRand(r.totalCents, true)}
                    <span className="ml-1.5 text-[10px]" style={{ color: 'var(--color-ink-3)' }}>{r.count}×</span>
                  </span>
                </div>
                <div className="h-[4px] w-full rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                  <div className="h-full" style={{ width: `${pct}%`, background: isCash ? 'var(--color-pos)' : 'var(--color-accent)' }} />
                </div>
                {r.topSamples.length > 0 && (
                  <details className="text-[10px]" style={{ color: 'var(--color-ink-3)' }}>
                    <summary className="cursor-pointer list-none">Examples ↓</summary>
                    <ul className="mt-1 ml-1 flex flex-col gap-0.5">
                      {r.topSamples.slice(0, 3).map((s, i) => <li key={i} className="truncate">• {s}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function YearGroupedBars({ years }: {
  years: Array<{ year: number; revenueCents: number; expenseCents: number; netCents: number }>
}) {
  const max = Math.max(...years.flatMap((y) => [y.revenueCents, Math.abs(y.expenseCents)]))
  if (max === 0) return <EmptyState message="No values." />
  const W = 320, H = 180, padX = 30, padTop = 14, padBottom = 32
  const innerW = W - padX * 2, innerH = H - padTop - padBottom
  const groupW = innerW / years.length
  const barW = Math.min(20, (groupW - 8) / 2)
  const yFor = (v: number) => padTop + innerH - (v / max) * innerH

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMinYMid meet" style={{ maxHeight: 220 }}>
      <g transform={`translate(${padX}, ${padTop - 6})`}>
        <rect x="0" y="-4" width="8" height="8" fill="var(--color-pos)" rx="1" />
        <text x="12" y="3" fontSize="9" fill="var(--color-ink-2)">Rev</text>
        <rect x="40" y="-4" width="8" height="8" fill="var(--color-neg)" rx="1" />
        <text x="52" y="3" fontSize="9" fill="var(--color-ink-2)">Exp</text>
      </g>
      {years.map((y, idx) => {
        const cx = padX + groupW * idx + groupW / 2
        const revX = cx - barW - 1, expX = cx + 1
        const revH = (y.revenueCents / max) * innerH
        const expH = (Math.abs(y.expenseCents) / max) * innerH
        const baseY = padTop + innerH
        const isProfit = y.netCents >= 0
        return (
          <g key={y.year}>
            <rect x={revX} y={baseY - revH} width={barW} height={revH} fill="var(--color-pos)" rx="2" />
            <rect x={expX} y={baseY - expH} width={barW} height={expH} fill="var(--color-neg)" rx="2" />
            <text x={cx} y={baseY + 11} textAnchor="middle" fontSize="10" fontWeight="500" fill="var(--color-ink)">{y.year}</text>
            <text x={cx} y={baseY + 22} textAnchor="middle" fontSize="8" fill={isProfit ? 'var(--color-pos)' : 'var(--color-neg)'} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {signedRand(y.netCents, true)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function YearRow({ year }: { year: { year: number; revenueCents: number; expenseCents: number; netCents: number; transactionCount: number } }) {
  const isProfit = year.netCents >= 0
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--color-surface-2)' }}>
      <div className="flex items-center gap-2">
        <BarChart3 size={12} style={{ color: 'var(--color-ink-3)' }} />
        <span className="text-[12px] font-medium" style={{ color: 'var(--color-ink)' }}>{year.year}</span>
        <span className="text-[10px]" style={{ color: 'var(--color-ink-3)' }}>{year.transactionCount} txn</span>
      </div>
      <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: isProfit ? 'var(--color-pos)' : 'var(--color-neg)', fontFamily: 'var(--font-display)' }}>
        {signedRand(year.netCents, true)}
      </span>
    </div>
  )
}
