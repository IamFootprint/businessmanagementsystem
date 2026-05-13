import type { ReportSnapshotData, ReportTransaction } from './report-engine'

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function reportToCsv(
  report: ReportSnapshotData,
  transactions: ReportTransaction[]
): string {
  const header = 'Date,Description,Amount (ZAR),Category,Direction,Status'
  const rows = transactions
    .filter((t) => t.reviewStatus === 'REVIEWED' && !t.isPersonal)
    .map((t) => {
      const date = t.transactionDate.toISOString().slice(0, 10)
      const desc = escapeCsv(t.cleanDescription)
      const amount = (t.amountCents / 100).toFixed(2)
      const category = escapeCsv(t.category?.name ?? 'Uncategorised')
      const direction = t.direction
      const status = t.reviewStatus
      return [date, desc, amount, category, direction, status].join(',')
    })
  const period = `${report.year}-${String(report.month).padStart(2, '0')}`
  const summary = [
    '',
    escapeCsv(`Summary: ${period}`),
    `Total Revenue,R${(report.totalRevenueCents / 100).toFixed(2)}`,
    `Total Expenses,R${(report.totalExpenseCents / 100).toFixed(2)}`,
    `Net Profit,R${(report.netProfitCents / 100).toFixed(2)}`,
  ]
  return [header, ...rows, ...summary].join('\n')
}
