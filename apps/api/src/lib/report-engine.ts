export type CategoryRef = { id: string; name: string } | null

export type ReportTransaction = {
  id: string
  businessId: string | null
  transactionDate: Date
  rawDescription: string
  cleanDescription: string
  amountCents: number
  direction: 'CREDIT' | 'DEBIT'
  transactionType: string
  reviewStatus: string
  isPersonal: boolean
  category: CategoryRef
}

export type ReportSnapshotData = {
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

export function buildReport(
  businessId: string,
  year: number,
  month: number,
  transactions: ReportTransaction[]
): ReportSnapshotData {
  const included = transactions.filter(
    (t) => t.reviewStatus === 'REVIEWED' && !t.isPersonal
  )

  let totalRevenueCents = 0
  let totalExpenseCents = 0
  let uncategorisedRevenueCents = 0
  let uncategorisedExpenseCents = 0

  const revMap = new Map<string, { name: string; amountCents: number }>()
  const expMap = new Map<string, { name: string; amountCents: number }>()

  for (const tx of included) {
    const isRevenue = tx.transactionType === 'REVENUE'
    const isExpense = tx.transactionType === 'EXPENSE'

    if (isRevenue) {
      totalRevenueCents += tx.amountCents
      if (tx.category) {
        const existing = revMap.get(tx.category.id)
        revMap.set(tx.category.id, {
          name: tx.category.name,
          amountCents: (existing?.amountCents ?? 0) + tx.amountCents,
        })
      } else {
        uncategorisedRevenueCents += tx.amountCents
      }
    } else if (isExpense) {
      totalExpenseCents += tx.amountCents
      if (tx.category) {
        const existing = expMap.get(tx.category.id)
        expMap.set(tx.category.id, {
          name: tx.category.name,
          amountCents: (existing?.amountCents ?? 0) + tx.amountCents,
        })
      } else {
        uncategorisedExpenseCents += tx.amountCents
      }
    }
  }

  return {
    businessId,
    year,
    month,
    generatedAt: new Date().toISOString(),
    totalRevenueCents,
    totalExpenseCents,
    netProfitCents: totalRevenueCents - totalExpenseCents,
    revenueByCategory: Array.from(revMap.entries()).map(([categoryId, v]) => ({ categoryId, ...v })),
    expenseByCategory: Array.from(expMap.entries()).map(([categoryId, v]) => ({ categoryId, ...v })),
    uncategorisedRevenueCents,
    uncategorisedExpenseCents,
    transactionCount: included.length,
  }
}
