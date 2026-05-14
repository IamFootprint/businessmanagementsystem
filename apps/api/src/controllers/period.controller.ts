import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { prisma, Prisma } from '@bms/db'
import { buildReport, type ReportTransaction } from '../lib/report-engine'
import { reportToCsv } from '../lib/csv-export'

const FINANCE_ROLES = ['TENANT_OWNER', 'FINANCE_MANAGER']

export async function listPeriods(c: Context<AppEnv>) {
  const user = c.get('user')
  const { businessId } = c.req.query()

  try {
    const where = businessId
      ? { businessId, business: { tenantId: user.tenantId } }
      : { business: { tenantId: user.tenantId } }

    const periods = await prisma.monthlyPeriod.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
    return c.json({ periods })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function createPeriod(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!FINANCE_ROLES.includes(user.role)) return c.json({ error: 'Forbidden' }, 403)

  let body: { businessId?: string; year?: number; month?: number }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const { businessId, year, month } = body
  if (!businessId || !year || !month) return c.json({ error: 'businessId, year, month required' }, 400)

  try {
    const business = await prisma.business.findFirst({ where: { id: businessId, tenantId: user.tenantId } })
    if (!business) return c.json({ error: 'Business not found' }, 404)

    const existing = await prisma.monthlyPeriod.findUnique({
      where: { businessId_year_month: { businessId, year, month } },
    })
    if (existing) return c.json({ period: existing }, 200)

    const period = await prisma.monthlyPeriod.create({
      data: { businessId, year, month },
    })
    return c.json({ period }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

function periodDateRange(year: number, month: number) {
  return {
    from: new Date(year, month - 1, 1),
    to: new Date(year, month, 0, 23, 59, 59, 999),
  }
}

async function fetchPeriodTransactions(businessId: string, year: number, month: number): Promise<ReportTransaction[]> {
  const { from, to } = periodDateRange(year, month)
  const transactions = await prisma.transaction.findMany({
    where: {
      businessId,
      transactionDate: { gte: from, lte: to },
    },
    include: { category: true },
  })
  return transactions.map((t) => ({
    id: t.id,
    businessId: t.businessId,
    transactionDate: t.transactionDate,
    rawDescription: t.rawDescription,
    cleanDescription: t.cleanDescription,
    amountCents: t.amountCents,
    direction: t.direction as 'CREDIT' | 'DEBIT',
    transactionType: t.transactionType,
    reviewStatus: t.reviewStatus,
    isPersonal: t.isPersonal,
    category: t.category ? { id: t.category.id, name: t.category.name } : null,
  }))
}

export async function lockPeriod(c: Context<AppEnv>) {
  const { id } = c.req.param()
  const user = c.get('user')
  if (!FINANCE_ROLES.includes(user.role)) return c.json({ error: 'Forbidden' }, 403)

  try {
    const period = await prisma.monthlyPeriod.findFirst({ where: { id, business: { tenantId: user.tenantId } } })
    if (!period) return c.json({ error: 'Not found' }, 404)
    if (period.status !== 'OPEN') return c.json({ error: 'Period must be OPEN to lock' }, 409)

    const { updatedPeriod, snapshot } = await prisma.$transaction(async (tx) => {
      const { from, to } = periodDateRange(period.year, period.month)
      const transactions = await tx.transaction.findMany({
        where: { businessId: period.businessId, transactionDate: { gte: from, lte: to } },
        include: { category: true },
      })
      const reportTxs: ReportTransaction[] = transactions.map((t) => ({
        id: t.id,
        businessId: t.businessId,
        transactionDate: t.transactionDate,
        rawDescription: t.rawDescription,
        cleanDescription: t.cleanDescription,
        amountCents: t.amountCents,
        direction: t.direction as 'CREDIT' | 'DEBIT',
        transactionType: t.transactionType,
        reviewStatus: t.reviewStatus,
        isPersonal: t.isPersonal,
        category: t.category ? { id: t.category.id, name: t.category.name } : null,
      }))
      const snapshotData = buildReport(period.businessId, period.year, period.month, reportTxs)

      const updatedPeriod = await tx.monthlyPeriod.update({
        where: { id },
        data: { status: 'LOCKED', lockedAt: new Date(), lockedById: user.id },
      })
      const snapshot = await tx.reportSnapshot.upsert({
        where: { periodId: id },
        create: { periodId: id, snapshotJson: snapshotData as Prisma.InputJsonValue },
        update: { snapshotJson: snapshotData as Prisma.InputJsonValue },
      })
      await tx.monthlyPeriodEvent.create({
        data: { periodId: id, actorId: user.id, action: 'LOCKED' },
      })
      return { updatedPeriod, snapshot }
    })

    return c.json({ period: updatedPeriod, snapshot: snapshot.snapshotJson })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function unlockPeriod(c: Context<AppEnv>) {
  const { id } = c.req.param()
  const user = c.get('user')
  if (user.role !== 'TENANT_OWNER') return c.json({ error: 'Forbidden — TENANT_OWNER only' }, 403)

  let body: { reason?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  if (!body.reason?.trim()) return c.json({ error: 'reason is required to unlock a period' }, 400)

  try {
    const period = await prisma.monthlyPeriod.findFirst({ where: { id, business: { tenantId: user.tenantId } } })
    if (!period) return c.json({ error: 'Not found' }, 404)
    if (period.status !== 'LOCKED') return c.json({ error: 'Period must be LOCKED to unlock' }, 409)

    const results = await prisma.$transaction([
      prisma.monthlyPeriod.update({
        where: { id },
        data: { status: 'OPEN', lockedAt: null },
      }),
      prisma.monthlyPeriodEvent.create({
        data: { periodId: id, actorId: user.id, action: 'UNLOCKED', reason: body.reason },
      }),
    ])

    const [updatedPeriod] = results

    return c.json({ period: updatedPeriod })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function getPeriodReport(c: Context<AppEnv>) {
  const { id } = c.req.param()
  const user = c.get('user')

  try {
    const snapshot = await prisma.reportSnapshot.findFirst({
      where: { periodId: id, period: { business: { tenantId: user.tenantId } } },
    })
    if (!snapshot) return c.json({ error: 'Report not yet generated — lock the period first' }, 404)
    return c.json({ snapshot: snapshot.snapshotJson })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function exportPeriodCsv(c: Context<AppEnv>) {
  const { id } = c.req.param()
  const user = c.get('user')

  try {
    const [period, snapshot] = await Promise.all([
      prisma.monthlyPeriod.findFirst({ where: { id, business: { tenantId: user.tenantId } } }),
      prisma.reportSnapshot.findFirst({ where: { periodId: id, period: { business: { tenantId: user.tenantId } } } }),
    ])
    if (!period) return c.json({ error: 'Not found' }, 404)
    if (!snapshot) return c.json({ error: 'Report not yet generated — lock the period first' }, 404)

    const reportTxs = await fetchPeriodTransactions(period.businessId, period.year, period.month)
    // ReportSnapshotData serialised as Json in Prisma — safe to cast since we control both write and read
    const snapshotData = snapshot.snapshotJson as Prisma.JsonValue as Parameters<typeof reportToCsv>[0]
    const csv = reportToCsv(snapshotData, reportTxs)
    const filename = `report-${period.year}-${String(period.month).padStart(2, '0')}.csv`

    return new Response(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}
