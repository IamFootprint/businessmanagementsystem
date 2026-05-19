import type { Context } from 'hono'
import { prisma } from '@bms/db'
import type { AppEnv } from '../types'
import type { ReviewStatus, TransactionType, Prisma } from '@bms/db'
import { writeAuditEvent } from '../lib/audit'
import { put } from '@vercel/blob'
import { cleanDescription, makeTransactionHash } from '../lib/import-hash'
import { applyRulesToTransactions } from '../lib/rules-engine'
import { PETTY_CASH_NICKNAME, MANUAL_ENTRIES_FILENAME } from './admin.controller'

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024
const ALLOWED_RECEIPT_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])

export async function listTransactions(c: Context<AppEnv>) {
  const user = c.get('user')
  const query = c.req.query()

  const bankAccountId = query.bankAccountId
  const businessId = query.businessId
  const reviewStatus = query.reviewStatus as ReviewStatus | undefined
  const categoryId = query.categoryId
  const supplierId = query.supplierId
  const search = query.search
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
    ...(search ? { rawDescription: { contains: search, mode: 'insensitive' as const } } : {}),
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

    // Snapshot before state (from previously fetched `transaction`)
    const before = {
      categoryId: transaction.categoryId ?? null,
      supplierId: transaction.supplierId ?? null,
      businessId: transaction.businessId ?? null,
      transactionType: transaction.transactionType,
      isPersonal: transaction.isPersonal,
      notes: transaction.notes ?? null,
      reviewStatus: transaction.reviewStatus,
    }
    const afterSnap: Record<string, unknown> = {}
    if (body.categoryId !== undefined) afterSnap.categoryId = body.categoryId
    if (body.supplierId !== undefined) afterSnap.supplierId = body.supplierId
    if (body.businessId !== undefined) afterSnap.businessId = body.businessId
    if (body.transactionType !== undefined) afterSnap.transactionType = body.transactionType
    if (body.isPersonal !== undefined) afterSnap.isPersonal = body.isPersonal
    if (body.notes !== undefined) afterSnap.notes = body.notes
    if (body.reviewStatus !== undefined) afterSnap.reviewStatus = body.reviewStatus

    await writeAuditEvent(id, user.id, before, afterSnap, 'UPDATE')
    return c.json(updated)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function getTransactionAudit(c: Context<AppEnv>) {
  const user = c.get('user')
  const { id } = c.req.param()

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { bankAccount: { select: { tenantId: true } } },
  })

  if (!transaction || transaction.bankAccount.tenantId !== user.tenantId) {
    return c.json({ error: 'Not found' }, 404)
  }

  const events = await prisma.transactionAuditEvent.findMany({
    where: { transactionId: id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      actor: { select: { name: true, email: true } },
    },
  })

  return c.json({ data: events })
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
    const afterSnap: Record<string, unknown> = {}
    if (body.categoryId !== undefined) afterSnap.categoryId = body.categoryId
    if (body.supplierId !== undefined) afterSnap.supplierId = body.supplierId
    if (body.businessId !== undefined) afterSnap.businessId = body.businessId
    if (body.transactionType !== undefined) afterSnap.transactionType = body.transactionType
    if (body.reviewStatus !== undefined) afterSnap.reviewStatus = body.reviewStatus
    void Promise.allSettled(body.ids.map(id => writeAuditEvent(id, user.id, {}, afterSnap, 'BULK_UPDATE')))

    return c.json({ updated: result.count })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

/**
 * POST /transactions/manual — record a cash purchase (or cash injection).
 *
 * Accepts multipart/form-data (so a receipt photo can be attached in the same
 * request). The transaction is anchored to the tenant's 'Petty Cash' bank
 * account and the '__manual_cash_entries__' StatementImport — both must be
 * provisioned beforehand via /admin/seed-petty-cash.
 *
 * After insert, the rules engine runs against the new transaction so manual
 * entries auto-categorise the same way imported lines do (e.g. TB MACHINES
 * → Office Supplies, Kgolaentle Holdings, REVIEWED).
 *
 * Fields (form fields):
 *   - date           ISO 8601 date (required)
 *   - description    free text (required)
 *   - amount         decimal in ZAR; positive number for expense and revenue
 *                    alike — direction is derived from transactionType
 *   - transactionType EXPENSE (default) | REVENUE | TRANSFER | OWNER_DRAW
 *   - categoryId, supplierId, businessId — optional UUIDs
 *   - notes          optional free text
 *   - isPersonal     'true' marks as personal
 *   - file           optional receipt photo/PDF (≤10 MB)
 */
export async function createManualTransaction(c: Context<AppEnv>) {
  const user = c.get('user')

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Expected multipart/form-data' }, 400)
  }

  const dateStr = formData.get('date')
  const descriptionStr = formData.get('description')
  const amountStr = formData.get('amount')
  const typeStr = formData.get('transactionType')

  if (typeof dateStr !== 'string' || !dateStr) return c.json({ error: 'date is required' }, 400)
  if (typeof descriptionStr !== 'string' || !descriptionStr.trim()) return c.json({ error: 'description is required' }, 400)
  if (typeof amountStr !== 'string' || !amountStr) return c.json({ error: 'amount is required' }, 400)

  const txnDate = new Date(dateStr)
  if (isNaN(txnDate.getTime())) return c.json({ error: 'Invalid date' }, 400)

  const amountFloat = parseFloat(amountStr)
  if (isNaN(amountFloat) || amountFloat <= 0) return c.json({ error: 'amount must be a positive number' }, 400)
  const absAmountCents = Math.round(amountFloat * 100)

  const transactionType = (typeof typeStr === 'string' ? typeStr : 'EXPENSE') as TransactionType
  const validTypes: TransactionType[] = ['EXPENSE', 'REVENUE', 'TRANSFER', 'OWNER_DRAW', 'BANK_CHARGE', 'REFUND', 'DIRECTOR_LOAN', 'TAX', 'UNKNOWN']
  if (!validTypes.includes(transactionType)) return c.json({ error: 'Invalid transactionType' }, 400)

  // REVENUE / cash-in is a CREDIT, everything else is a DEBIT and stored negative.
  const isCredit = transactionType === 'REVENUE' || transactionType === 'OWNER_DRAW' || transactionType === 'REFUND'
  const signedAmountCents = isCredit ? absAmountCents : -absAmountCents

  const categoryId = formData.get('categoryId')
  const supplierId = formData.get('supplierId')
  const businessId = formData.get('businessId')
  const notes = formData.get('notes')
  const isPersonal = formData.get('isPersonal') === 'true'

  // Locate the tenant's Petty Cash account + manual-entries import
  const pettyCash = await prisma.bankAccount.findFirst({
    where: { tenantId: user.tenantId, nickname: PETTY_CASH_NICKNAME },
    select: { id: true },
  })
  if (!pettyCash) {
    return c.json({ error: 'Petty Cash account not provisioned. Run /admin/seed-petty-cash first.' }, 409)
  }

  const manualImport = await prisma.statementImport.findFirst({
    where: { bankAccountId: pettyCash.id, fileName: MANUAL_ENTRIES_FILENAME },
    select: { id: true },
  })
  if (!manualImport) {
    return c.json({ error: 'Manual entries import not provisioned. Run /admin/seed-petty-cash first.' }, 409)
  }

  // Validate scoped FK targets
  if (typeof categoryId === 'string' && categoryId) {
    const found = await prisma.category.findUnique({ where: { id: categoryId }, select: { tenantId: true } })
    if (!found || found.tenantId !== user.tenantId) return c.json({ error: 'categoryId not found' }, 404)
  }
  if (typeof supplierId === 'string' && supplierId) {
    const found = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { tenantId: true } })
    if (!found || found.tenantId !== user.tenantId) return c.json({ error: 'supplierId not found' }, 404)
  }
  if (typeof businessId === 'string' && businessId) {
    const found = await prisma.business.findUnique({ where: { id: businessId }, select: { tenantId: true } })
    if (!found || found.tenantId !== user.tenantId) return c.json({ error: 'businessId not found' }, 404)
  }

  // Compute running balance for the petty-cash account up to & including this txn.
  // We base it on the most recent transaction by date that already exists; this is
  // accurate when new entries are appended chronologically.
  const latest = await prisma.transaction.findFirst({
    where: { bankAccountId: pettyCash.id },
    orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    select: { balanceAfterCents: true },
  })
  const balanceAfterCents = (latest?.balanceAfterCents ?? 0) + signedAmountCents

  const rawDescription = descriptionStr.trim()
  const clean = cleanDescription(rawDescription)

  // Make the hash unique even for identical re-entries (manual user can legitimately
  // log two R50 same-day same-merchant cash payments).
  const noncedRaw = `${rawDescription}|manual|${user.id}|${Date.now()}|${Math.random().toString(36).slice(2, 8)}`
  const duplicateHash = makeTransactionHash({
    bankAccountId: pettyCash.id,
    transactionDate: txnDate,
    amountCents: signedAmountCents,
    balanceAfterCents,
    rawDescription: noncedRaw,
  })

  // Find the next csvRowNumber for this synthetic import
  const lastRow = await prisma.transaction.findFirst({
    where: { importId: manualImport.id },
    orderBy: { csvRowNumber: 'desc' },
    select: { csvRowNumber: true },
  })
  const csvRowNumber = (lastRow?.csvRowNumber ?? 0) + 1

  // Receipt: either an existing Receipt id (from /receipts/capture) OR a new file upload.
  const existingReceiptIdRaw = formData.get('receiptId')
  const existingReceiptId = typeof existingReceiptIdRaw === 'string' && existingReceiptIdRaw ? existingReceiptIdRaw : null
  const file = formData.get('file')
  let receiptStoragePath: string | null = null
  let receiptFile: File | null = null

  // If an existing receiptId is provided, validate ownership (uploader or tenant business).
  if (existingReceiptId) {
    const found = await prisma.receipt.findUnique({
      where: { id: existingReceiptId },
      select: { id: true, uploadedById: true, hintBusinessId: true },
    })
    if (!found) return c.json({ error: 'receiptId not found' }, 404)
    if (found.uploadedById !== user.id) {
      // Owner / Finance Manager can confirm any tenant receipt; others can only confirm their own.
      const isPrivileged = user.role === 'TENANT_OWNER' || user.role === 'FINANCE_MANAGER'
      if (!isPrivileged) return c.json({ error: 'receiptId belongs to a different user' }, 403)
    }
  } else if (file && typeof file !== 'string') {
    receiptFile = file as File
    if (receiptFile.size > MAX_RECEIPT_BYTES) return c.json({ error: 'Receipt exceeds 10 MB limit' }, 413)
    const mime = receiptFile.type || 'application/octet-stream'
    if (!ALLOWED_RECEIPT_MIMES.has(mime)) return c.json({ error: 'Receipt must be JPEG, PNG, WEBP, GIF or PDF' }, 415)

    const blobToken = c.env.BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN
    if (!blobToken) return c.json({ error: 'Storage not configured' }, 500)

    const safeName = receiptFile.name.replace(/[^\w.\-]/g, '_').slice(0, 128) || 'receipt'
    try {
      const blob = await put(`receipts/${Date.now()}-${safeName}`, receiptFile, {
        access: 'public',
        token: blobToken,
      })
      receiptStoragePath = blob.url
    } catch {
      return c.json({ error: 'Receipt upload failed' }, 500)
    }
  }

  // Create the transaction
  const txn = await prisma.transaction.create({
    data: {
      bankAccountId: pettyCash.id,
      importId: manualImport.id,
      transactionDate: txnDate,
      rawDescription,
      cleanDescription: clean,
      amountCents: signedAmountCents,
      balanceAfterCents,
      duplicateHash,
      csvRowNumber,
      direction: isCredit ? 'CREDIT' : 'DEBIT',
      transactionType,
      isPersonal,
      notes: typeof notes === 'string' ? notes : null,
      categoryId: typeof categoryId === 'string' && categoryId ? categoryId : null,
      supplierId: typeof supplierId === 'string' && supplierId ? supplierId : null,
      businessId: typeof businessId === 'string' && businessId ? businessId : null,
      reviewStatus: 'NEEDS_REVIEW',
    },
    select: { id: true, cleanDescription: true, reviewStatus: true, categoryId: true, supplierId: true, businessId: true, transactionType: true, isPersonal: true },
  })

  // If no manual category/supplier/business given, let the rules engine fill them in
  if (!txn.categoryId && !txn.supplierId && !txn.businessId) {
    const rules = await prisma.transactionRule.findMany({
      where: { tenantId: user.tenantId, active: true },
      select: {
        id: true, descriptionPattern: true, categoryId: true, supplierId: true,
        businessId: true, transactionType: true, isPersonal: true,
        trustedAutoReview: true, priority: true, active: true,
      },
    })
    const [match] = applyRulesToTransactions([{
      id: txn.id,
      cleanDescription: txn.cleanDescription,
      reviewStatus: txn.reviewStatus,
      categoryId: txn.categoryId,
      supplierId: txn.supplierId,
      businessId: txn.businessId,
      transactionType: txn.transactionType,
      isPersonal: txn.isPersonal,
    }], rules)
    if (match) {
      await prisma.transaction.update({
        where: { id: txn.id },
        data: {
          ruleId: match.ruleId,
          categoryId: match.categoryId,
          supplierId: match.supplierId,
          businessId: match.businessId,
          transactionType: match.transactionType ?? transactionType,
          isPersonal: match.isPersonal ?? isPersonal,
          reviewStatus: match.reviewStatus,
        },
      })
    }
  }

  // Save / link the receipt to this transaction.
  let receiptId: string | null = null
  if (existingReceiptId) {
    // Confirm the captured receipt by linking it to the just-created transaction.
    await prisma.receipt.update({
      where: { id: existingReceiptId },
      data: {
        transactionId: txn.id,
        matchStatus: 'MATCHED',
        matchedById: user.id,
        matchedAt: new Date(),
      },
    })
    receiptId = existingReceiptId
  } else if (receiptStoragePath && receiptFile) {
    const created = await prisma.receipt.create({
      data: {
        transactionId: txn.id,
        uploadedById: user.id,
        uploaderPhone: 'manual-entry',
        storagePath: receiptStoragePath,
        fileName: receiptFile.name,
        fileMimeType: receiptFile.type || 'application/octet-stream',
        fileSizeBytes: receiptFile.size,
        matchStatus: 'MATCHED',
        matchedById: user.id,
        matchedAt: new Date(),
        hintAmountCents: absAmountCents,
        hintDate: txnDate,
      },
      select: { id: true },
    })
    receiptId = created.id
  }

  await writeAuditEvent(txn.id, user.id, {}, {
    notes: `manual entry · ${signedAmountCents} cents`,
    transactionType,
  }, 'CREATE')

  return c.json({ ok: true, transactionId: txn.id, receiptId, balanceAfterCents }, 201)
}
