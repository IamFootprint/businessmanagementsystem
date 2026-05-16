import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { prisma } from '@bms/db'

/**
 * GET /analytics/overview
 *
 * Returns aggregated analytics across the tenant's transactions:
 *   - KPIs: total revenue, total expenses, net, txn count, categorised %
 *   - Monthly P&L for last 24 months
 *   - Top categories (by spend), top suppliers, per-business breakdown
 *   - Year totals (last 4 years)
 *
 * All amounts in cents. Tenant-scoped via bank account ownership.
 */
export async function analyticsOverview(c: Context<AppEnv>) {
  const user = c.get('user')

  // Optional filter: scope the entire dashboard to a single business unit.
  // 'unassigned' is a special value meaning transactions with no businessId.
  const businessFilter = c.req.query('businessId')
  // Optional date-range filter (YYYY-MM-DD inclusive)
  const fromStr = c.req.query('from')
  const toStr = c.req.query('to')
  const fromDate = fromStr && /^\d{4}-\d{2}-\d{2}$/.test(fromStr) ? new Date(`${fromStr}T00:00:00Z`) : null
  const toDate = toStr && /^\d{4}-\d{2}-\d{2}$/.test(toStr) ? new Date(`${toStr}T23:59:59.999Z`) : null

  // Get bank account IDs and businesses for this tenant
  const [bankAccounts, businesses] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    }),
    prisma.business.findMany({
      where: { tenantId: user.tenantId, active: true },
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  const bankAccountIds = bankAccounts.map((b) => b.id)
  if (bankAccountIds.length === 0) {
    return c.json({
      kpis: { totalRevenueCents: 0, totalExpenseCents: 0, netCents: 0, transactionCount: 0, categorisedPct: 0 },
      monthlyPnL: [],
      topCategories: [],
      topSuppliers: [],
      perBusiness: [],
      yearTotals: [],
      businesses: [],
      filter: { businessId: null },
    })
  }

  // Fetch ALL transactions for this tenant (the dataset is ~3000 — fine to aggregate in-memory)
  // For larger datasets we'd push more into SQL via raw queries
  const allTxs = await prisma.transaction.findMany({
    where: { bankAccountId: { in: bankAccountIds } },
    select: {
      id: true,
      transactionDate: true,
      amountCents: true,
      direction: true,
      isPersonal: true,
      transactionType: true,
      categoryId: true,
      supplierId: true,
      businessId: true,
      category: { select: { id: true, name: true, categoryType: true } },
      supplier: { select: { id: true, name: true } },
      business: { select: { id: true, slug: true, name: true } },
    },
    orderBy: { transactionDate: 'asc' },
  })

  // Apply business + date filters early so the rest of the aggregation is scoped
  const txs = allTxs.filter((t) => {
    if (businessFilter === 'unassigned') {
      if (t.businessId !== null) return false
    } else if (businessFilter) {
      if (t.businessId !== businessFilter) return false
    }
    if (fromDate && t.transactionDate < fromDate) return false
    if (toDate && t.transactionDate > toDate) return false
    return true
  })

  // Filter out personal expenses for business analytics
  const businessTxs = txs.filter((t) => !t.isPersonal)

  // KPIs
  let totalRevenueCents = 0
  let totalExpenseCents = 0
  let categorisedCount = 0
  for (const t of businessTxs) {
    if (t.direction === 'CREDIT' && t.transactionType !== 'TRANSFER') totalRevenueCents += t.amountCents
    if (t.direction === 'DEBIT' && t.transactionType !== 'TRANSFER') totalExpenseCents += t.amountCents
    if (t.categoryId) categorisedCount++
  }
  const netCents = totalRevenueCents + totalExpenseCents // expenses are negative
  const categorisedPct =
    businessTxs.length > 0 ? Math.round((categorisedCount / businessTxs.length) * 100) : 0

  // Monthly P&L
  const monthlyMap = new Map<string, { revenue: number; expense: number; count: number }>()
  for (const t of businessTxs) {
    if (t.transactionType === 'TRANSFER') continue
    const d = t.transactionDate
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const m = monthlyMap.get(ym) ?? { revenue: 0, expense: 0, count: 0 }
    if (t.direction === 'CREDIT') m.revenue += t.amountCents
    else m.expense += t.amountCents
    m.count++
    monthlyMap.set(ym, m)
  }
  const monthlyPnL = Array.from(monthlyMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([ym, v]) => ({
      yearMonth: ym,
      revenueCents: v.revenue,
      expenseCents: v.expense,
      netCents: v.revenue + v.expense,
      transactionCount: v.count,
    }))

  // Top categories (by absolute spend, descending)
  const catMap = new Map<string, { id: string; name: string; type: string; totalCents: number; count: number }>()
  for (const t of businessTxs) {
    if (t.direction !== 'DEBIT' || t.transactionType === 'TRANSFER') continue
    const key = t.category?.id ?? '__uncategorised__'
    const name = t.category?.name ?? 'Uncategorised'
    const type = t.category?.categoryType ?? 'UNKNOWN'
    const c = catMap.get(key) ?? { id: key, name, type, totalCents: 0, count: 0 }
    c.totalCents += Math.abs(t.amountCents)
    c.count++
    catMap.set(key, c)
  }
  const topCategories = Array.from(catMap.values())
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 10)

  // Top suppliers (by spend)
  const supMap = new Map<string, { id: string; name: string; totalCents: number; count: number }>()
  for (const t of businessTxs) {
    if (t.direction !== 'DEBIT' || !t.supplier || t.transactionType === 'TRANSFER') continue
    const s = supMap.get(t.supplier.id) ?? { id: t.supplier.id, name: t.supplier.name, totalCents: 0, count: 0 }
    s.totalCents += Math.abs(t.amountCents)
    s.count++
    supMap.set(t.supplier.id, s)
  }
  const topSuppliers = Array.from(supMap.values())
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 10)

  // Per-business breakdown
  const bizMap = new Map<string, {
    id: string; slug: string; name: string;
    revenueCents: number; expenseCents: number; count: number;
  }>()
  for (const t of businessTxs) {
    if (!t.business || t.transactionType === 'TRANSFER') continue
    const b = bizMap.get(t.business.id) ?? {
      id: t.business.id, slug: t.business.slug, name: t.business.name,
      revenueCents: 0, expenseCents: 0, count: 0,
    }
    if (t.direction === 'CREDIT') b.revenueCents += t.amountCents
    else b.expenseCents += t.amountCents
    b.count++
    bizMap.set(t.business.id, b)
  }
  const perBusiness = Array.from(bizMap.values())
    .sort((a, b) => (b.revenueCents - b.expenseCents) - (a.revenueCents - a.expenseCents))
    .map((b) => ({ ...b, netCents: b.revenueCents + b.expenseCents }))

  // Year totals
  const yearMap = new Map<number, { revenue: number; expense: number; count: number }>()
  for (const t of businessTxs) {
    if (t.transactionType === 'TRANSFER') continue
    const y = t.transactionDate.getUTCFullYear()
    const yr = yearMap.get(y) ?? { revenue: 0, expense: 0, count: 0 }
    if (t.direction === 'CREDIT') yr.revenue += t.amountCents
    else yr.expense += t.amountCents
    yr.count++
    yearMap.set(y, yr)
  }
  const yearTotals = Array.from(yearMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, v]) => ({
      year,
      revenueCents: v.revenue,
      expenseCents: v.expense,
      netCents: v.revenue + v.expense,
      transactionCount: v.count,
    }))

  // Include count of unassigned txns so the UI can show a helpful filter chip
  const unassignedCount = allTxs.filter((t) => t.businessId === null && !t.isPersonal).length

  return c.json({
    kpis: {
      totalRevenueCents,
      totalExpenseCents,
      netCents,
      transactionCount: businessTxs.length,
      categorisedPct,
      personalCount: txs.length - businessTxs.length,
    },
    monthlyPnL,
    topCategories,
    topSuppliers,
    perBusiness,
    yearTotals,
    businesses,
    filter: {
      businessId: businessFilter ?? null,
      from: fromStr ?? null,
      to: toStr ?? null,
    },
    unassignedCount,
  })
}
