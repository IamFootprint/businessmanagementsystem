import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { prisma, ReceiptMatchStatus } from '@bms/db'
import { put } from '@vercel/blob'
import { rankCandidates } from '../lib/receipt-match'

const STALE_DAYS = 90
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function uploadReceiptPublic(c: Context<AppEnv>) {
  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Invalid multipart data' }, 400)
  }

  const file = formData.get('file')
  const phone = formData.get('phone')

  if (!file || typeof file === 'string') return c.json({ error: 'file is required' }, 400)
  if (!phone || typeof phone !== 'string') return c.json({ error: 'phone is required' }, 400)
  if ((file as File).size > MAX_FILE_BYTES) return c.json({ error: 'File exceeds 10 MB limit' }, 413)

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!blobToken) return c.json({ error: 'Storage not configured' }, 500)

  const lat = formData.get('lat')
  const lng = formData.get('lng')
  const hintAmount = formData.get('hintAmount')
  const hintDate = formData.get('hintDate')
  const hintSupplier = formData.get('hintSupplier')
  const hintBusinessId = formData.get('hintBusinessId')

  let storagePath: string
  try {
    const blob = await put(`receipts/${Date.now()}-${(file as File).name}`, file as File, {
      access: 'public',
      token: blobToken,
    })
    storagePath = blob.url
  } catch {
    return c.json({ error: 'Storage upload failed' }, 500)
  }

  try {
    const receipt = await prisma.receipt.create({
      data: {
        uploaderPhone: phone,
        uploaderLat: lat ? (isNaN(parseFloat(lat as string)) ? null : parseFloat(lat as string)) : null,
        uploaderLng: lng ? (isNaN(parseFloat(lng as string)) ? null : parseFloat(lng as string)) : null,
        hintAmountCents: hintAmount ? (isNaN(parseFloat(hintAmount as string)) ? null : Math.round(parseFloat(hintAmount as string) * 100)) : null,
        hintDate: (() => {
          if (!hintDate) return null
          const d = new Date(hintDate as string)
          return isNaN(d.getTime()) ? null : d
        })(),
        hintSupplier: hintSupplier ? String(hintSupplier) : null,
        hintBusinessId: hintBusinessId ? String(hintBusinessId) : null,
        storagePath,
        fileName: (file as File).name,
        fileMimeType: (file as File).type || 'application/octet-stream',
        fileSizeBytes: (file as File).size,
      },
    })
    return c.json({ receiptId: receipt.id }, 201)
  } catch {
    return c.json({ error: 'Failed to save receipt' }, 500)
  }
}

export async function listReceipts(c: Context<AppEnv>) {
  const user = c.get('user')
  const { matchStatus, businessId } = c.req.query()

  try {
    const tenantBusinessIds = (
      await prisma.business.findMany({ where: { tenantId: user.tenantId }, select: { id: true } })
    ).map((b) => b.id)

    const where: Record<string, unknown> = {
      hintBusinessId: { in: tenantBusinessIds },
    }
    if (matchStatus) where.matchStatus = matchStatus
    if (businessId) {
      if (!tenantBusinessIds.includes(businessId)) return c.json({ error: 'Not found' }, 404)
      where.hintBusinessId = businessId
    }

    const receipts = await prisma.receipt.findMany({
      where,
      orderBy: { capturedAt: 'desc' },
      take: 100,
    })
    return c.json({ receipts })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function updateReceipt(c: Context<AppEnv>) {
  const { id } = c.req.param()
  const user = c.get('user')

  let body: { matchStatus?: string; transactionId?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  if (body.matchStatus !== undefined && !Object.values(ReceiptMatchStatus).includes(body.matchStatus as ReceiptMatchStatus)) {
    return c.json({ error: 'Invalid matchStatus value' }, 400)
  }
  if (body.matchStatus === undefined && body.transactionId === undefined) {
    return c.json({ error: 'At least one of matchStatus or transactionId is required' }, 400)
  }

  try {
    const receipt = await prisma.receipt.findUnique({ where: { id } })
    if (!receipt) return c.json({ error: 'Not found' }, 404)
    if (receipt.hintBusinessId) {
      const business = await prisma.business.findFirst({ where: { id: receipt.hintBusinessId, tenantId: user.tenantId } })
      if (!business) return c.json({ error: 'Not found' }, 404)
    }

    const updated = await prisma.receipt.update({
      where: { id },
      data: {
        ...(body.matchStatus ? { matchStatus: body.matchStatus as ReceiptMatchStatus } : {}),
        ...(body.transactionId !== undefined ? { transactionId: body.transactionId, matchedById: user.id, matchedAt: new Date() } : {}),
      },
    })
    return c.json({ receipt: updated })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2003') {
      return c.json({ error: 'Referenced user not found' }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function matchReceipt(c: Context<AppEnv>) {
  const { id } = c.req.param()
  const user = c.get('user')

  try {
    const receipt = await prisma.receipt.findUnique({ where: { id } })
    if (!receipt) return c.json({ error: 'Not found' }, 404)
    if (receipt.hintBusinessId) {
      const business = await prisma.business.findFirst({ where: { id: receipt.hintBusinessId, tenantId: user.tenantId } })
      if (!business) return c.json({ error: 'Not found' }, 404)
    }

    const hint = {
      hintAmountCents: receipt.hintAmountCents,
      hintDate: receipt.hintDate,
      hintSupplier: receipt.hintSupplier,
    }

    const where: Record<string, unknown> = {}
    if (receipt.hintBusinessId) where.businessId = receipt.hintBusinessId

    const transactions = await prisma.transaction.findMany({
      where,
      select: { id: true, amountCents: true, transactionDate: true, cleanDescription: true },
      take: 500,
    })

    const candidates = transactions.map((t) => ({
      id: t.id,
      amountCents: t.amountCents,
      date: t.transactionDate,
      cleanDescription: t.cleanDescription,
    }))

    const ranked = rankCandidates(hint, candidates)

    if (ranked.length > 0) {
      const best = ranked[0]
      await prisma.receipt.update({
        where: { id },
        data: {
          matchStatus: best.matchStatus as ReceiptMatchStatus,
          matchScore: best.score,
          transactionId: best.matchStatus === 'MATCHED' ? best.transactionId : undefined,
          matchedAt: new Date(),
        },
      })
    } else {
      await prisma.receipt.update({
        where: { id },
        data: { matchStatus: ReceiptMatchStatus.UNMATCHED, matchedAt: new Date() },
      })
    }

    return c.json({ candidates: ranked })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function markStaleReceipts(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!['TENANT_OWNER', 'FINANCE_MANAGER'].includes(user.role)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const cutoff = new Date(Date.now() - STALE_MS)

  try {
    const result = await prisma.receipt.updateMany({
      where: {
        capturedAt: { lt: cutoff },
        matchStatus: { in: [ReceiptMatchStatus.UNMATCHED, ReceiptMatchStatus.SUGGESTED] },
        isStale: false,
      },
      data: { isStale: true, matchStatus: ReceiptMatchStatus.STALE },
    })
    return c.json({ marked: result.count })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}
