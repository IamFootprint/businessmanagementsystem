import { apiRequestAuthenticated } from '@/lib/api-client.server'

type SnapshotData = {
  businessId: string
  year: number
  month: number
  generatedAt: string
  totalRevenueCents: number
  totalExpenseCents: number
  netProfitCents: number
  revenueByCategory: { categoryId: string; name: string; amountCents: number }[]
  expenseByCategory: { categoryId: string; name: string; amountCents: number }[]
  uncategorisedRevenueCents: number
  uncategorisedExpenseCents: number
  transactionCount: number
}
type ReportResponse = { snapshot: SnapshotData }

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function fmt(cents: number) {
  return `R${(cents / 100).toFixed(2)}`
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ periodId: string }>
}) {
  const { periodId } = await params
  const { snapshot } = await apiRequestAuthenticated<ReportResponse>(
    `/periods/${periodId}/report`
  )

  const title = `${MONTH_NAMES[snapshot.month - 1]} ${snapshot.year} Report`

  return (
    <div>
      <h1>{title}</h1>
      <p>Generated: {new Date(snapshot.generatedAt).toLocaleString('en-ZA')}</p>

      <table>
        <tbody>
          <tr><td>Total Revenue</td><td>{fmt(snapshot.totalRevenueCents)}</td></tr>
          <tr><td>Total Expenses</td><td>{fmt(snapshot.totalExpenseCents)}</td></tr>
          <tr><td><strong>Net Profit</strong></td><td><strong>{fmt(snapshot.netProfitCents)}</strong></td></tr>
          <tr><td>Transactions included</td><td>{snapshot.transactionCount}</td></tr>
        </tbody>
      </table>

      {snapshot.expenseByCategory.length > 0 && (
        <>
          <h2>Expenses by Category</h2>
          <table>
            <thead><tr><th>Category</th><th>Amount</th></tr></thead>
            <tbody>
              {snapshot.expenseByCategory.map((e) => (
                <tr key={e.categoryId}>
                  <td>{e.name}</td>
                  <td>{fmt(e.amountCents)}</td>
                </tr>
              ))}
              {snapshot.uncategorisedExpenseCents > 0 && (
                <tr><td>Uncategorised</td><td>{fmt(snapshot.uncategorisedExpenseCents)}</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {snapshot.revenueByCategory.length > 0 && (
        <>
          <h2>Revenue by Category</h2>
          <table>
            <thead><tr><th>Category</th><th>Amount</th></tr></thead>
            <tbody>
              {snapshot.revenueByCategory.map((r) => (
                <tr key={r.categoryId}>
                  <td>{r.name}</td>
                  <td>{fmt(r.amountCents)}</td>
                </tr>
              ))}
              {snapshot.uncategorisedRevenueCents > 0 && (
                <tr><td>Uncategorised</td><td>{fmt(snapshot.uncategorisedRevenueCents)}</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}

      <a href={`${API_BASE}/periods/${periodId}/export`} download>
        Download CSV
      </a>
    </div>
  )
}
