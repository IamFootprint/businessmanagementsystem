import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { prisma, ReceiptMatchStatus } from '@bms/db'
import { rankCandidates } from '../lib/receipt-match'
import { extractReceipt, OpenAIAuthError, OpenAIRateLimitError } from '../lib/openai-vision'
import { findBestSupplierMatch, type SupplierCandidate } from '../lib/supplier-match'
import { applyRulesToTransactions } from '../lib/rules-engine'
import { putReceipt } from '../lib/r2-storage'

const STALE_DAYS = 90
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

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
  const mimeType = (file as File).type || 'application/octet-stream'
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return c.json({ error: 'Only JPEG, PNG, WEBP, GIF, and PDF files are accepted' }, 415)
  }

  if (!c.env.RECEIPTS_BUCKET) return c.json({ error: 'Storage not configured (R2 bucket missing)' }, 500)

  const lat = formData.get('lat')
  const lng = formData.get('lng')
  const hintAmount = formData.get('hintAmount')
  const hintDate = formData.get('hintDate')
  const hintSupplier = formData.get('hintSupplier')
  const hintBusinessId = formData.get('hintBusinessId')

  const safeFileName = (file as File).name.replace(/[^\w.\-]/g, '_').slice(0, 128) || 'upload'
  let storagePath: string
  try {
    const bytes = await (file as File).arrayBuffer()
    const stored = await putReceipt(c.env.RECEIPTS_BUCKET, safeFileName, bytes, mimeType)
    storagePath = stored.url
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
        fileName: safeFileName,
        fileMimeType: mimeType,
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
    const [tenantBusinessIds, tenantUserPhones] = await Promise.all([
      prisma.business.findMany({ where: { tenantId: user.tenantId }, select: { id: true } }).then(bs => bs.map(b => b.id)),
      prisma.user.findMany({ where: { tenantId: user.tenantId, phone: { not: null } }, select: { phone: true } }).then(us => us.map(u => u.phone as string)),
    ])

    const baseOr: Record<string, unknown>[] = [
      { hintBusinessId: { in: tenantBusinessIds } },
      ...(tenantUserPhones.length > 0 ? [{ hintBusinessId: null, uploaderPhone: { in: tenantUserPhones } }] : []),
    ]

    const where: Record<string, unknown> = { OR: baseOr }
    if (matchStatus) where.matchStatus = matchStatus
    if (businessId) {
      if (!tenantBusinessIds.includes(businessId)) return c.json({ error: 'Not found' }, 404)
      where.hintBusinessId = businessId
      delete where.OR
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
    } else {
      const tenantPhones = await prisma.user
        .findMany({ where: { tenantId: user.tenantId, phone: { not: null } }, select: { phone: true } })
        .then(us => us.map(u => u.phone as string))
      if (!tenantPhones.includes(receipt.uploaderPhone)) {
        return c.json({ error: 'Not found' }, 404)
      }
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

    const where: Record<string, unknown> = { bankAccount: { tenantId: user.tenantId } }
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
    const [tenantBusinessIds, tenantUserPhones] = await Promise.all([
      prisma.business.findMany({ where: { tenantId: user.tenantId }, select: { id: true } }).then(bs => bs.map(b => b.id)),
      prisma.user.findMany({ where: { tenantId: user.tenantId, phone: { not: null } }, select: { phone: true } }).then(us => us.map(u => u.phone as string)),
    ])

    const result = await prisma.receipt.updateMany({
      where: {
        OR: [
          { hintBusinessId: { in: tenantBusinessIds } },
          ...(tenantUserPhones.length > 0 ? [{ hintBusinessId: null, uploaderPhone: { in: tenantUserPhones } }] : []),
        ],
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


/**
 * POST /receipts/capture — OCR a receipt photo and return pre-fill data.
 *
 * Multipart form: { file: image, latLng?: "<lat>,<lng>" }.
 * Behaviour:
 *   1. Validates the file (image, ≤10 MB).
 *   2. Uploads to Vercel Blob.
 *   3. Calls OpenAI GPT-4o-mini vision to extract structured fields.
 *   4. Fuzzy-matches the extracted merchant against existing suppliers.
 *   5. Runs the rules engine on a synthetic transaction (just the cleanDescription)
 *      to suggest business + category.
 *   6. Creates a Receipt(uploadedById = current user, matchStatus = UNMATCHED,
 *      hint* fields populated from OCR).
 *   7. Returns { receipt, ocr, supplierMatch, suggestedBusinessId, suggestedCategoryId }
 *      so the client can render the review form pre-filled.
 *
 * Roles: TENANT_OWNER, FINANCE_MANAGER, ACCOUNTANT, DRIVER.
 */
export async function captureReceipt(c: Context<AppEnv>) {
  const user = c.get('user')

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Expected multipart/form-data' }, 400)
  }

  const file = formData.get('file')
  if (!file || typeof file === 'string') return c.json({ error: 'file is required' }, 400)
  const f = file as File
  if (f.size > MAX_FILE_BYTES) return c.json({ error: 'File exceeds 10 MB limit' }, 413)
  const mimeType = f.type || 'application/octet-stream'
  if (!ALLOWED_IMAGE_MIMES.has(mimeType)) {
    return c.json({ error: 'Receipt capture requires an image (JPEG, PNG, WEBP, or GIF)' }, 415)
  }

  const apiKey = c.env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY
  if (!apiKey) return c.json({ error: 'OCR not configured (OPENAI_API_KEY missing)' }, 500)
  if (!c.env.RECEIPTS_BUCKET) return c.json({ error: 'Storage not configured (R2 bucket missing)' }, 500)

  // Read bytes once — needed by both the R2 upload AND the OCR call.
  let imageBytes: ArrayBuffer
  try {
    imageBytes = await f.arrayBuffer()
  } catch {
    return c.json({ error: 'Could not read uploaded file' }, 400)
  }

  // Upload to R2 + run OCR in parallel for speed.
  let ocrResult: Awaited<ReturnType<typeof extractReceipt>>
  let storagePath: string
  try {
    const [stored, ocr] = await Promise.all([
      putReceipt(c.env.RECEIPTS_BUCKET, f.name, imageBytes, mimeType),
      extractReceipt(imageBytes, mimeType, apiKey),
    ])
    storagePath = stored.url
    ocrResult = ocr
  } catch (err) {
    if (err instanceof OpenAIAuthError) return c.json({ error: 'OCR service authentication failed' }, 500)
    if (err instanceof OpenAIRateLimitError) return c.json({ error: 'OCR service rate limited — try again shortly' }, 503)
    return c.json({ error: `Capture failed: ${err instanceof Error ? err.message : 'unknown'}` }, 500)
  }

  const safeFileName = f.name.replace(/[^\w.\-]/g, '_').slice(0, 128) || 'receipt'

  // 4. Fuzzy-match merchant against existing suppliers
  let supplierMatch: { id: string; name: string; score: number } | null = null
  if (ocrResult.merchant) {
    const tenantSuppliers = await prisma.supplier.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, name: true, aliases: { select: { pattern: true } } },
    })
    const candidates: SupplierCandidate[] = tenantSuppliers.map((s) => ({
      id: s.id,
      name: s.name,
      aliases: s.aliases.map((a) => a.pattern),
    }))
    const match = findBestSupplierMatch(ocrResult.merchant, candidates)
    if (match) {
      supplierMatch = { id: match.supplier.id, name: match.supplier.name, score: match.score }
    }
  }

  // 5. Suggest business + category by running active rules against the OCR'd merchant.
  let suggestedBusinessId: string | null = null
  let suggestedCategoryId: string | null = null
  let suggestedSupplierId: string | null = supplierMatch?.id ?? null
  let suggestedTransactionType: string | null = null
  let suggestedIsPersonal: boolean | null = null
  if (ocrResult.merchant) {
    const cleanDesc = ocrResult.merchant.toUpperCase()
    const rules = await prisma.transactionRule.findMany({
      where: { tenantId: user.tenantId, active: true },
      select: {
        id: true, descriptionPattern: true, categoryId: true, supplierId: true,
        businessId: true, transactionType: true, isPersonal: true,
        trustedAutoReview: true, priority: true, active: true,
      },
    })
    const [ruleMatch] = applyRulesToTransactions(
      [{
        id: 'synthetic-' + Date.now(),
        cleanDescription: cleanDesc,
        reviewStatus: 'NEEDS_REVIEW',
        categoryId: null,
        supplierId: null,
        businessId: null,
        transactionType: 'UNKNOWN',
        isPersonal: false,
      }],
      rules,
    )
    if (ruleMatch) {
      suggestedBusinessId = ruleMatch.businessId
      suggestedCategoryId = ruleMatch.categoryId
      suggestedSupplierId = suggestedSupplierId ?? ruleMatch.supplierId
      suggestedTransactionType = ruleMatch.transactionType
      suggestedIsPersonal = ruleMatch.isPersonal
    }
  }

  // 6. If no business suggested by rules, fall back to driver's defaultBusinessId.
  if (!suggestedBusinessId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { defaultBusinessId: true },
    })
    if (dbUser?.defaultBusinessId) suggestedBusinessId = dbUser.defaultBusinessId
  }

  // 7. Persist the Receipt with the OCR hints.
  const totalCents = ocrResult.totalAmount != null ? Math.round(ocrResult.totalAmount * 100) : null
  const txnDate = (() => {
    if (!ocrResult.transactionDate) return null
    const d = new Date(ocrResult.transactionDate)
    return isNaN(d.getTime()) ? null : d
  })()

  const receipt = await prisma.receipt.create({
    data: {
      uploadedById: user.id,
      uploaderPhone: user.email, // we use email as the per-user identifier here
      hintAmountCents: totalCents,
      hintDate: txnDate,
      hintSupplier: ocrResult.merchant,
      hintBusinessId: suggestedBusinessId,
      storagePath,
      fileName: safeFileName,
      fileMimeType: mimeType,
      fileSizeBytes: f.size,
      matchStatus: ReceiptMatchStatus.UNMATCHED,
    },
    select: {
      id: true, storagePath: true, hintAmountCents: true, hintDate: true,
      hintSupplier: true, hintBusinessId: true, matchStatus: true, capturedAt: true,
    },
  })

  return c.json({
    ok: true,
    receipt,
    ocr: ocrResult,
    suggestion: {
      supplierId: suggestedSupplierId,
      supplierMatch,
      businessId: suggestedBusinessId,
      categoryId: suggestedCategoryId,
      transactionType: suggestedTransactionType,
      isPersonal: suggestedIsPersonal,
    },
  }, 201)
}

/**
 * GET /receipts/mine — list the current user's own captured receipts.
 *
 * Drivers see only their own; managers/owners see all via the regular
 * /receipts endpoint.
 */
export async function listMyReceipts(c: Context<AppEnv>) {
  const user = c.get('user')
  const receipts = await prisma.receipt.findMany({
    where: { uploadedById: user.id },
    orderBy: { capturedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      hintSupplier: true,
      hintAmountCents: true,
      hintDate: true,
      hintBusinessId: true,
      matchStatus: true,
      capturedAt: true,
      storagePath: true,
      transactionId: true,
    },
  })
  return c.json({ data: receipts })
}

/**
 * GET /receipts/file/:key — stream a receipt photo from R2.
 *
 * No session required: the key is a CUID-style random nonce (~96 bits of
 * entropy) that's only handed out via authenticated endpoints, so anyone who
 * holds the URL is implicitly authorised. Same security model as Vercel Blob's
 * default public URLs.
 *
 * Sets long browser caching (1 year, immutable) since receipt photos never change.
 */
export async function getReceiptFile(c: Context<AppEnv>) {
  const key = c.req.param('key')
  if (!key) return c.json({ error: 'key is required' }, 400)
  if (!c.env.RECEIPTS_BUCKET) return c.json({ error: 'Storage not configured' }, 500)

  const obj = await c.env.RECEIPTS_BUCKET.get(key)
  if (!obj) return c.json({ error: 'Not found' }, 404)

  const headers = new Headers()
  if (obj.httpMetadata?.contentType) headers.set('Content-Type', obj.httpMetadata.contentType)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('Content-Length', String(obj.size))

  return new Response(obj.body, { status: 200, headers })
}
