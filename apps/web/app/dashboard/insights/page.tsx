import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { InsightsClient } from './InsightsClient'

export type AnalyticsOverview = {
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
  topCategories: Array<{
    id: string
    name: string
    type: string
    totalCents: number
    count: number
  }>
  topSuppliers: Array<{
    id: string
    name: string
    totalCents: number
    count: number
  }>
  perBusiness: Array<{
    id: string
    slug: string
    name: string
    revenueCents: number
    expenseCents: number
    netCents: number
    count: number
  }>
  yearTotals: Array<{
    year: number
    revenueCents: number
    expenseCents: number
    netCents: number
    transactionCount: number
  }>
  businesses: Array<{ id: string; slug: string; name: string }>
  filter: { businessId: string | null; from: string | null; to: string | null }
  unassignedCount: number
}

function computePeriodRange(period: string | undefined, now = new Date()): { from?: string; to?: string; label: string } {
  if (!period || period === 'all') return { label: 'All time' }
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  if (period === 'month') {
    return { from: fmt(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))), to: fmt(today), label: 'This month' }
  }
  if (period === 'quarter') {
    const qStartMonth = Math.floor(today.getUTCMonth() / 3) * 3
    return { from: fmt(new Date(Date.UTC(today.getUTCFullYear(), qStartMonth, 1))), to: fmt(today), label: 'This quarter' }
  }
  if (period === '6m') {
    return { from: fmt(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1))), to: fmt(today), label: 'Last 6 months' }
  }
  if (period === 'ytd') {
    return { from: fmt(new Date(Date.UTC(today.getUTCFullYear(), 0, 1))), to: fmt(today), label: `YTD ${today.getUTCFullYear()}` }
  }
  if (/^\d{4}$/.test(period)) {
    const yr = parseInt(period, 10)
    return { from: `${yr}-01-01`, to: `${yr}-12-31`, label: String(yr) }
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

  const qs = new URLSearchParams()
  if (businessId) qs.set('businessId', businessId)
  if (periodInfo.from) qs.set('from', periodInfo.from)
  if (periodInfo.to) qs.set('to', periodInfo.to)
  const apiPath = qs.toString() ? `/analytics/overview?${qs}` : '/analytics/overview'

  let data: AnalyticsOverview | null = null
  let loadError: string | null = null

  try {
    data = await apiRequestAuthenticated<AnalyticsOverview>(apiPath)
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load analytics'
  }

  if (loadError || !data) {
    return (
      <div className="flex flex-col gap-4 px-[var(--page-gutter)] py-6">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">Insights</h1>
        <div
          role="alert"
          className="rounded-[10px] border px-4 py-3 text-[13px]"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-bad) 25%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-bad) 8%, transparent)',
            color: 'var(--color-bad)',
          }}
        >
          {loadError ?? 'No data available.'}
        </div>
      </div>
    )
  }

  return <InsightsClient data={data} businessId={businessId} period={period} />
}
