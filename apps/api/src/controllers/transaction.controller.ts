import type { Context } from 'hono'
import { prisma } from '@bms/db'
import type { AppEnv } from '../types'
import type { ReviewStatus, TransactionType, Prisma } from '@bms/db'

export async function listTransactions(c: Context<AppEnv>) {
  const user = c.get('user')
  const query = c.req.query()

  const bankAccountId = query.bankAccountId
  const businessId = query.businessId
  const reviewStatus = query.reviewStatus as ReviewStatus | undefined
  const categoryId = query.categoryId
  const supplierId = query.supplierId
  const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined
  const dateTo = query.dateTo ? new Date(query.dateTo) : undefined
  const page = Math.max(1, parseInt(query.page ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? '50', 10)))

  const where: Prisma.TransactionWhereInput = {
    bankAccount: { tenantId: user.tenantId },
    ...(bankAccountId ? { bankAccountId } : {}),
    ...(businessId ? { businessId } : {}),
    ...(reviewStatus ? { reviewStatus } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(supplierId ? { supplierId } : {}),
    ...(dateFrom || dateTo
      ? {
          transactionDate: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
  }

  try {
    const [transactions, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: { select: { id: true, name: true, categoryType: true } },
          supplier: { select: { id: true, name: true } },
          bankAccount: { select: { nickname: true, bankName: true } },
          business: { select: { id: true, name: true } },
        },
      }),
      prisma.transaction.count({ where }),
    ])

    return c.json({
      data: transactions,
      meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) },
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function updateTransaction(c: Context<AppEnv>) {
  const user = c.get('user')
  const { id } = c.req.param()

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { bankAccount: { select: { tenantId: true } } },
  })

  if (!transaction || transaction.bankAccount.tenantId !== user.tenantId) {
    return c.json({ error: 'Not found' }, 404)
  }

  if (transaction.reviewStatus === 'LOCKED') {
    return c.json({ error: 'Transaction is locked' }, 409)
  }

  type UpdateBody = {
    categoryId?: string | null
    supplierId?: string | null
    businessId?: string | null
    transactionType?: TransactionType
    isPersonal?: boolean
    notes?: string | null
    reviewStatus?: ReviewStatus
  }
  const body: UpdateBody = await c.req.json<UpdateBody>().catch(() => ({} as UpdateBody))

  try {
    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.supplierId !== undefined ? { supplierId: body.supplierId } : {}),
        ...(body.businessId !== undefined ? { businessId: body.businessId } : {}),
        ...(body.transactionType !== undefined ? { transactionType: body.transactionType } : {}),
        ...(body.isPersonal !== undefined ? { isPersonal: body.isPersonal } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.reviewStatus !== undefined
          ? {
              reviewStatus: body.reviewStatus,
              reviewedById: body.reviewStatus === 'REVIEWED' ? user.id : undefined,
              reviewedAt: body.reviewStatus === 'REVIEWED' ? new Date() : undefined,
            }
          : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    })
    return c.json(updated)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function bulkUpdateTransactions(c: Context<AppEnv>) {
  const user = c.get('user')

  type BulkBody = {
    ids: string[]
    categoryId?: string | null
    supplierId?: string | null
    businessId?: string | null
    transactionType?: TransactionType
    reviewStatus?: ReviewStatus
  }
  const body: BulkBody = await c.req.json<BulkBody>().catch(() => ({ ids: [] as string[] } as BulkBody))

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return c.json({ error: 'ids array is required' }, 400)
  }

  if (body.ids.length > 200) {
    return c.json({ error: 'Cannot bulk-update more than 200 transactions at once' }, 400)
  }

  try {
    const result = await prisma.transaction.updateMany({
      where: {
        id: { in: body.ids },
        bankAccount: { tenantId: user.tenantId },
        reviewStatus: { not: 'LOCKED' },
      },
      data: {
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.supplierId !== undefined ? { supplierId: body.supplierId } : {}),
        ...(body.businessId !== undefined ? { businessId: body.businessId } : {}),
        ...(body.transactionType !== undefined ? { transactionType: body.transactionType } : {}),
        ...(body.reviewStatus !== undefined
          ? {
              reviewStatus: body.reviewStatus,
              reviewedById: body.reviewStatus === 'REVIEWED' ? user.id : undefined,
              reviewedAt: body.reviewStatus === 'REVIEWED' ? new Date() : undefined,
            }
          : {}),
      },
    })
    return c.json({ updated: result.count })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}
