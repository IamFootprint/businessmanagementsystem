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
}

export default async function InsightsPage() {
  let data: AnalyticsOverview | null = null
  let loadError: string | null = null

  try {
    data = await apiRequestAuthenticated<AnalyticsOverview>('/analytics/overview')
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

  return <InsightsClient data={data} />
}
