# Receipts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the receipt capture pipeline — a public WhatsApp-linked upload endpoint, a 3-signal match engine that links receipts to bank transactions, a stale-receipt flag job, and a staff inbox page for review.

**Architecture:** Receipts arrive from a public URL (no auth required) with GPS coords captured via a browser `useEffect` client component. The match engine runs 3 signals (exact amount ± 0, date ±3 days, supplier substring) and sets MATCHED/SUGGESTED/UNMATCHED. Staff review via an authenticated dashboard inbox page.

**Tech Stack:** Hono 4, Prisma 6 (PostgreSQL), Vercel Blob (via `@vercel/blob`), Next.js 15 App Router, React 19, Vitest

---

## File Structure

| File | Purpose |
|------|---------|
| `apps/api/src/lib/receipt-match.ts` | Pure 3-signal match engine (no DB) |
| `apps/api/src/controllers/receipt.controller.ts` | Public upload + authenticated CRUD + match + stale |
| `apps/api/src/routes/receipt.routes.ts` | Route registration |
| `apps/api/src/routes/index.ts` | ← add `registerReceiptRoutes` |
| `apps/api/__tests__/receipt.test.ts` | Integration tests |
| `apps/web/app/receipts/upload/page.tsx` | Public upload form (server component wrapper) |
| `apps/web/app/receipts/upload/GpsCapture.tsx` | Client component for GPS (useEffect) |
| `apps/web/app/receipts/upload/actions.ts` | Server action — POST to public API |
| `apps/web/app/dashboard/receipts/page.tsx` | Staff inbox — lists receipts with status filter |

---

### Task 1: Receipt match engine (pure function)

**Files:**
- Create: `apps/api/src/lib/receipt-match.ts`

The match engine receives a receipt and a list of candidate transactions, scores each candidate on 3 signals, and returns a ranked list of matches. No DB access.

**Signals:**
1. Amount: exact match of `receipt.hintAmountCents === transaction.amountCents` → score +1
2. Date: `|receipt.hintDate - transaction.date| <= 3 days` → score +1
3. Supplier: transaction's `cleanDescription` contains `receipt.hintSupplier` substring (case-insensitive) → score +1

**Result status:**
- score === 3 → MATCHED
- score === 2 → SUGGESTED
- score < 2 → UNMATCHED (excluded from results)

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/__tests__/receipt-match.test.ts
import { describe, it, expect } from 'vitest'
import { scoreReceipt, ReceiptHint, TransactionCandidate } from '../src/lib/receipt-match'

const base: TransactionCandidate = {
  id: 'tx1',
  amountCents: 5000,
  date: new Date('2024-01-15'),
  cleanDescription: 'PICK N PAY STORES PTY LTD',
}

const hint: ReceiptHint = {
  hintAmountCents: 5000,
  hintDate: new Date('2024-01-15'),
  hintSupplier: 'pick n pay',
}

describe('scoreReceipt', () => {
  it('returns score 3 and MATCHED when all signals match', () => {
    const result = scoreReceipt(hint, base)
    expect(result.score).toBe(3)
    expect(result.matchStatus).toBe('MATCHED')
  })

  it('returns score 2 and SUGGESTED when amount and date match but supplier does not', () => {
    const result = scoreReceipt({ ...hint, hintSupplier: 'woolworths' }, base)
    expect(result.score).toBe(2)
    expect(result.matchStatus).toBe('SUGGESTED')
  })

  it('returns score 1 and UNMATCHED when only amount matches', () => {
    const result = scoreReceipt(
      { ...hint, hintDate: new Date('2024-02-20'), hintSupplier: 'woolworths' },
      base
    )
    expect(result.score).toBe(1)
    expect(result.matchStatus).toBe('UNMATCHED')
  })

  it('accepts date within 3-day window', () => {
    const result = scoreReceipt({ ...hint, hintDate: new Date('2024-01-18') }, base)
    expect(result.score).toBe(3)
  })

  it('rejects date outside 3-day window', () => {
    const result = scoreReceipt({ ...hint, hintDate: new Date('2024-01-19') }, base)
    expect(result.score).toBe(2) // amount + supplier, not date
  })

  it('handles null hints gracefully — scores 0 for null signal', () => {
    const result = scoreReceipt(
      { hintAmountCents: null, hintDate: null, hintSupplier: null },
      base
    )
    expect(result.score).toBe(0)
    expect(result.matchStatus).toBe('UNMATCHED')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm vitest run __tests__/receipt-match.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the implementation**

```typescript
// apps/api/src/lib/receipt-match.ts
export type TransactionCandidate = {
  id: string
  amountCents: number
  date: Date
  cleanDescription: string
}

export type ReceiptHint = {
  hintAmountCents: number | null
  hintDate: Date | null
  hintSupplier: string | null
}

export type MatchResult = {
  transactionId: string
  score: number
  matchStatus: 'MATCHED' | 'SUGGESTED' | 'UNMATCHED'
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export function scoreReceipt(hint: ReceiptHint, tx: TransactionCandidate): MatchResult {
  let score = 0

  if (hint.hintAmountCents !== null && hint.hintAmountCents === tx.amountCents) {
    score++
  }
  if (hint.hintDate !== null && Math.abs(hint.hintDate.getTime() - tx.date.getTime()) <= THREE_DAYS_MS) {
    score++
  }
  if (hint.hintSupplier !== null && tx.cleanDescription.toUpperCase().includes(hint.hintSupplier.toUpperCase())) {
    score++
  }

  const matchStatus: MatchResult['matchStatus'] =
    score === 3 ? 'MATCHED' : score === 2 ? 'SUGGESTED' : 'UNMATCHED'

  return { transactionId: tx.id, score, matchStatus }
}

export function rankCandidates(hint: ReceiptHint, candidates: TransactionCandidate[]): MatchResult[] {
  return candidates
    .map((tx) => scoreReceipt(hint, tx))
    .filter((r) => r.score >= 2)
    .sort((a, b) => b.score - a.score)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && pnpm vitest run __tests__/receipt-match.test.ts
```

Expected: 6/6 PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/receipt-match.ts apps/api/__tests__/receipt-match.test.ts
git commit -m "feat(receipts): 3-signal receipt match engine (pure function)"
```

---

### Task 2: Receipt controller and routes

**Files:**
- Create: `apps/api/src/controllers/receipt.controller.ts`
- Create: `apps/api/src/routes/receipt.routes.ts`
- Modify: `apps/api/src/routes/index.ts`

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/receipts/public` | none | Upload receipt (multipart/form-data) |
| GET | `/receipts` | session | List receipts (filters: matchStatus, tenantId, businessId) |
| PATCH | `/receipts/:id` | session | Update matchStatus, link transactionId |
| POST | `/receipts/:id/match` | session | Run match engine for one receipt |
| POST | `/receipts/mark-stale` | session | Flag receipts >90 days UNMATCHED/SUGGESTED |

**Public upload fields (multipart):**
- `file` — the receipt image/PDF (required)
- `phone` — uploader phone (required, stored as `uploaderPhone`)
- `lat` — GPS latitude (optional)
- `lng` — GPS longitude (optional)
- `hintAmount` — amount in cents (optional)
- `hintDate` — ISO date string (optional)
- `hintSupplier` — supplier name hint (optional)
- `hintBusinessId` — businessId hint (optional)

**Storage:** Store file to Vercel Blob via `@vercel/blob`. `storagePath` = blob URL. If `BLOB_READ_WRITE_TOKEN` is missing, throw 500.

**Stale rule:** `capturedAt < now - 90 days` AND `matchStatus IN [UNMATCHED, SUGGESTED]` → set `isStale = true` and `matchStatus = STALE`.

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/api/__tests__/receipt.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createApp } from '../src/app'
import { prisma } from '@bms/db'
import type { Tenant, User, BankAccount, Business, Transaction } from '@bms/db'

let app: ReturnType<typeof createApp>
let token: string
let tenantId: string
let businessId: string
let bankAccountId: string
let txId: string
let receiptId: string

beforeAll(async () => {
  app = createApp()

  // create tenant + user
  const tenant = await prisma.tenant.create({ data: { name: 'ReceiptTestTenant', slug: 'receipt-test-tenant' } })
  tenantId = tenant.id

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: 'receipt-test@kgolaentle.com',
      name: 'Receipt Tester',
      passwordHash: '$2b$12$placeholder',
      role: 'TENANT_OWNER',
    },
  })

  // create session
  const session = await prisma.session.create({
    data: { userId: user.id, token: 'receipt-test-token-abc', expiresAt: new Date(Date.now() + 86400000) },
  })
  token = session.token

  // create business + bank account
  const biz = await prisma.business.create({ data: { tenantId, name: 'Receipt Biz', currencyCode: 'ZAR' } })
  businessId = biz.id
  const ba = await prisma.bankAccount.create({
    data: { tenantId, businessId, bankName: 'Standard Bank', accountNumber: '000999', currencyCode: 'ZAR' },
  })
  bankAccountId = ba.id

  // create a transaction to match against
  const tx = await prisma.transaction.create({
    data: {
      tenantId,
      bankAccountId,
      businessId,
      date: new Date('2024-03-10'),
      amountCents: 12500,
      currency: 'ZAR',
      rawDescription: 'PICK N PAY STORES 001',
      cleanDescription: 'PICK N PAY STORES 001',
      type: 'DEBIT',
      balanceAfterCents: 100000,
      duplicateHash: 'receipt-test-hash-unique',
      reviewStatus: 'NEEDS_REVIEW',
    },
  })
  txId = tx.id
})

afterAll(async () => {
  if (txId) await prisma.transaction.deleteMany({ where: { id: txId } })
  if (receiptId) await prisma.receipt.deleteMany({ where: { id: receiptId } })
  await prisma.bankAccount.deleteMany({ where: { id: bankAccountId } })
  await prisma.business.deleteMany({ where: { id: businessId } })
  await prisma.session.deleteMany({ where: { token } })
  await prisma.user.deleteMany({ where: { email: 'receipt-test@kgolaentle.com' } })
  await prisma.tenant.deleteMany({ where: { id: tenantId } })
  await prisma.$disconnect()
})

describe('GET /receipts', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/receipts')
    expect(res.status).toBe(401)
  })

  it('returns empty list initially', async () => {
    const res = await app.request('/receipts', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { receipts: unknown[] }
    expect(Array.isArray(body.receipts)).toBe(true)
  })
})

describe('POST /receipts/:id/match', () => {
  it('returns 404 for unknown receipt', async () => {
    const res = await app.request('/receipts/nonexistent/match', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
  })
})

describe('POST /receipts/mark-stale', () => {
  it('returns count of receipts marked stale', async () => {
    const res = await app.request('/receipts/mark-stale', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { marked: number }
    expect(typeof body.marked).toBe('number')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm vitest run __tests__/receipt.test.ts
```

Expected: FAIL with "Cannot find route" / 404 errors

- [ ] **Step 3: Write the controller**

```typescript
// apps/api/src/controllers/receipt.controller.ts
import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { prisma } from '@bms/db'
import { put } from '@vercel/blob'
import { rankCandidates } from '../lib/receipt-match'

const STALE_DAYS = 90
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000

export async function uploadReceiptPublic(c: Context<AppEnv>) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!blobToken) return c.json({ error: 'Storage not configured' }, 500)

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
        uploaderLat: lat ? parseFloat(lat as string) : null,
        uploaderLng: lng ? parseFloat(lng as string) : null,
        hintAmountCents: hintAmount ? parseInt(hintAmount as string, 10) : null,
        hintDate: hintDate ? new Date(hintDate as string) : null,
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
  const { matchStatus, businessId } = c.req.query()

  const where: Record<string, unknown> = {}
  if (matchStatus) where.matchStatus = matchStatus
  if (businessId) where.hintBusinessId = businessId

  try {
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

  try {
    const receipt = await prisma.receipt.findUnique({ where: { id } })
    if (!receipt) return c.json({ error: 'Not found' }, 404)

    const updated = await prisma.receipt.update({
      where: { id },
      data: {
        ...(body.matchStatus ? { matchStatus: body.matchStatus as never } : {}),
        ...(body.transactionId !== undefined ? { transactionId: body.transactionId, matchedById: user.id, matchedAt: new Date() } : {}),
      },
    })
    return c.json({ receipt: updated })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function matchReceipt(c: Context<AppEnv>) {
  const { id } = c.req.param()

  try {
    const receipt = await prisma.receipt.findUnique({ where: { id } })
    if (!receipt) return c.json({ error: 'Not found' }, 404)

    const hint = {
      hintAmountCents: receipt.hintAmountCents,
      hintDate: receipt.hintDate,
      hintSupplier: receipt.hintSupplier,
    }

    const where: Record<string, unknown> = {}
    if (receipt.hintBusinessId) where.businessId = receipt.hintBusinessId

    const transactions = await prisma.transaction.findMany({
      where,
      select: { id: true, amountCents: true, date: true, cleanDescription: true },
      take: 500,
    })

    const candidates = transactions.map((t) => ({
      id: t.id,
      amountCents: t.amountCents,
      date: t.date,
      cleanDescription: t.cleanDescription,
    }))

    const ranked = rankCandidates(hint, candidates)

    if (ranked.length > 0) {
      const best = ranked[0]
      await prisma.receipt.update({
        where: { id },
        data: {
          matchStatus: best.matchStatus as never,
          matchScore: best.score,
          transactionId: best.matchStatus === 'MATCHED' ? best.transactionId : undefined,
          matchedAt: new Date(),
        },
      })
    }

    return c.json({ candidates: ranked })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function markStaleReceipts(c: Context<AppEnv>) {
  const cutoff = new Date(Date.now() - STALE_MS)

  try {
    const result = await prisma.receipt.updateMany({
      where: {
        capturedAt: { lt: cutoff },
        matchStatus: { in: ['UNMATCHED', 'SUGGESTED'] },
        isStale: false,
      },
      data: { isStale: true, matchStatus: 'STALE' },
    })
    return c.json({ marked: result.count })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}
```

- [ ] **Step 4: Write the routes file**

```typescript
// apps/api/src/routes/receipt.routes.ts
import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import {
  uploadReceiptPublic,
  listReceipts,
  updateReceipt,
  matchReceipt,
  markStaleReceipts,
} from '../controllers/receipt.controller'

export function registerReceiptRoutes(app: Hono<AppEnv>) {
  app.post('/receipts/public', uploadReceiptPublic)
  app.get('/receipts', sessionMiddleware, listReceipts)
  app.patch('/receipts/:id', sessionMiddleware, updateReceipt)
  app.post('/receipts/:id/match', sessionMiddleware, matchReceipt)
  app.post('/receipts/mark-stale', sessionMiddleware, markStaleReceipts)
}
```

- [ ] **Step 5: Register routes in index.ts**

Edit `apps/api/src/routes/index.ts` — add import and call:

```typescript
import { registerReceiptRoutes } from './receipt.routes'
// inside registerRoutes:
registerReceiptRoutes(app)
```

- [ ] **Step 6: Install @vercel/blob in apps/api**

```bash
cd apps/api && pnpm add @vercel/blob
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd apps/api && pnpm vitest run __tests__/receipt.test.ts
```

Expected: 5/5 PASS

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/controllers/receipt.controller.ts \
        apps/api/src/routes/receipt.routes.ts \
        apps/api/src/routes/index.ts \
        apps/api/__tests__/receipt.test.ts \
        apps/api/package.json \
        pnpm-lock.yaml
git commit -m "feat(receipts): public upload, list, match, and stale-flag endpoints"
```

---

### Task 3: GPS capture client component + public upload form

**Files:**
- Create: `apps/web/app/receipts/upload/GpsCapture.tsx`
- Create: `apps/web/app/receipts/upload/actions.ts`
- Create: `apps/web/app/receipts/upload/page.tsx`

The upload page is public (no auth). The GPS is captured in a `'use client'` component via `useEffect` so it runs in the browser. The form POSTs to the API's `/receipts/public` endpoint.

- [ ] **Step 1: Write GpsCapture.tsx**

```typescript
// apps/web/app/receipts/upload/GpsCapture.tsx
'use client'
import { useEffect } from 'react'

export function GpsCapture() {
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      const latEl = document.getElementById('gps-lat') as HTMLInputElement | null
      const lngEl = document.getElementById('gps-lng') as HTMLInputElement | null
      if (latEl) latEl.value = String(pos.coords.latitude)
      if (lngEl) lngEl.value = String(pos.coords.longitude)
    })
  }, [])
  return null
}
```

- [ ] **Step 2: Write the server action**

```typescript
// apps/web/app/receipts/upload/actions.ts
'use server'
import { apiRequest } from '@/lib/api-client'

export async function uploadReceiptAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const file = formData.get('file')
  const phone = formData.get('phone')

  if (!file || typeof file === 'string') return { error: 'Please attach a file.' }
  if (!phone || typeof phone !== 'string' || !phone.trim()) return { error: 'Phone number is required.' }

  try {
    await apiRequest<{ receiptId: string }>('/receipts/public', {
      method: 'POST',
      body: formData,
    })
    return { success: true }
  } catch {
    return { error: 'Upload failed. Please try again.' }
  }
}
```

- [ ] **Step 3: Write the page**

```typescript
// apps/web/app/receipts/upload/page.tsx
import { GpsCapture } from './GpsCapture'
import { uploadReceiptAction } from './actions'
import { UploadReceiptForm } from './UploadReceiptForm'

export default function ReceiptUploadPage() {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Upload Receipt</h1>
      <p>Attach a photo or PDF of your receipt. We will match it to your transaction.</p>
      <GpsCapture />
      <UploadReceiptForm action={uploadReceiptAction} />
    </main>
  )
}
```

- [ ] **Step 4: Write UploadReceiptForm (client component for useActionState)**

```typescript
// apps/web/app/receipts/upload/UploadReceiptForm.tsx
'use client'
import { useActionState } from 'react'

type State = { error?: string; success?: boolean }

export function UploadReceiptForm({ action }: { action: (prev: State, formData: FormData) => Promise<State> }) {
  const [state, formAction, pending] = useActionState(action, {})

  if (state.success) {
    return <p>Receipt uploaded successfully. Thank you!</p>
  }

  return (
    <form action={formAction} encType="multipart/form-data">
      <input type="hidden" id="gps-lat" name="lat" />
      <input type="hidden" id="gps-lng" name="lng" />

      <div>
        <label htmlFor="phone">Your phone number</label>
        <input id="phone" name="phone" type="tel" required placeholder="+27 82 000 0000" />
      </div>

      <div>
        <label htmlFor="file">Receipt (photo or PDF)</label>
        <input id="file" name="file" type="file" required accept="image/*,application/pdf" />
      </div>

      <div>
        <label htmlFor="hintAmount">Amount (cents, optional)</label>
        <input id="hintAmount" name="hintAmount" type="number" placeholder="e.g. 5000 for R50.00" />
      </div>

      <div>
        <label htmlFor="hintDate">Date on receipt (optional)</label>
        <input id="hintDate" name="hintDate" type="date" />
      </div>

      <div>
        <label htmlFor="hintSupplier">Supplier name (optional)</label>
        <input id="hintSupplier" name="hintSupplier" type="text" placeholder="e.g. Pick n Pay" />
      </div>

      {state.error && <p style={{ color: 'red' }}>{state.error}</p>}

      <button type="submit" disabled={pending}>
        {pending ? 'Uploading...' : 'Upload Receipt'}
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/receipts/
git commit -m "feat(web): public receipt upload form with client-side GPS capture"
```

---

### Task 4: Dashboard receipts inbox page

**Files:**
- Create: `apps/web/app/dashboard/receipts/page.tsx`

Staff can filter receipts by `matchStatus` and see the uploader phone, hint details, and current match status.

- [ ] **Step 1: Write the page**

```typescript
// apps/web/app/dashboard/receipts/page.tsx
import { apiRequestAuthenticated } from '@/lib/api-client.server'

type Receipt = {
  id: string
  uploaderPhone: string
  capturedAt: string
  matchStatus: string
  isStale: boolean
  hintAmountCents: number | null
  hintDate: string | null
  hintSupplier: string | null
  storagePath: string
  fileName: string
}

type ReceiptsResponse = { receipts: Receipt[] }

const STATUS_COLORS: Record<string, string> = {
  MATCHED: 'green',
  SUGGESTED: 'orange',
  UNMATCHED: 'gray',
  STALE: 'red',
}

export default async function ReceiptsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ matchStatus?: string; businessId?: string }>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  if (params.matchStatus) qs.set('matchStatus', params.matchStatus)
  if (params.businessId) qs.set('businessId', params.businessId)

  const { receipts } = await apiRequestAuthenticated<ReceiptsResponse>(
    `/receipts${qs.size ? `?${qs}` : ''}`
  )

  const statuses = ['UNMATCHED', 'SUGGESTED', 'MATCHED', 'STALE']

  return (
    <div>
      <h1>Receipt Inbox</h1>

      <nav>
        {statuses.map((s) => (
          <a key={s} href={`?matchStatus=${s}`} style={{ marginRight: 8, fontWeight: params.matchStatus === s ? 'bold' : 'normal' }}>
            {s}
          </a>
        ))}
        <a href="?" style={{ marginRight: 8 }}>All</a>
      </nav>

      {receipts.length === 0 ? (
        <p>No receipts found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Phone</th>
              <th>Captured</th>
              <th>Status</th>
              <th>Amount Hint</th>
              <th>Date Hint</th>
              <th>Supplier Hint</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id}>
                <td>
                  <a href={r.storagePath} target="_blank" rel="noopener noreferrer">
                    {r.fileName}
                  </a>
                </td>
                <td>{r.uploaderPhone}</td>
                <td>{new Date(r.capturedAt).toLocaleDateString('en-ZA')}</td>
                <td style={{ color: STATUS_COLORS[r.matchStatus] ?? 'inherit' }}>
                  {r.matchStatus}
                  {r.isStale ? ' ⚠' : ''}
                </td>
                <td>{r.hintAmountCents != null ? `R${(r.hintAmountCents / 100).toFixed(2)}` : '—'}</td>
                <td>{r.hintDate ? new Date(r.hintDate).toLocaleDateString('en-ZA') : '—'}</td>
                <td>{r.hintSupplier ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/dashboard/receipts/page.tsx
git commit -m "feat(web): dashboard receipts inbox with status filter"
```

---

### Task 5: Wire receipt upload page into Next.js middleware allowlist

The `/receipts/upload` route must be publicly accessible — no redirect to `/login`.

**Files:**
- Modify: `apps/web/middleware.ts`

- [ ] **Step 1: Update the middleware PUBLIC_PATHS**

Open `apps/web/middleware.ts`. The current `PUBLIC_PATHS` array includes only `'/login'`. Add `'/receipts/upload'`.

Current code (find this exact section):
```typescript
const PUBLIC_PATHS = ['/login']
```

Replace with:
```typescript
const PUBLIC_PATHS = ['/login', '/receipts/upload']
```

- [ ] **Step 2: Verify middleware logic handles prefix match**

The middleware check must use `startsWith` or exact match. Confirm the existing check — if it's exact equality, change to `startsWith` so sub-routes of `/receipts/upload` (like query strings) are also public:

```typescript
const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "feat(web): whitelist /receipts/upload as public route in middleware"
```

---

## Test count summary

| Plan | Tests added |
|------|------------|
| After Plan 4 | ~50 (5 db + 45 api) |
| Plan 5 Task 1 | +6 (receipt-match unit) |
| Plan 5 Task 2 | +5 (receipt API integration) |
| **After Plan 5** | **~61** |
