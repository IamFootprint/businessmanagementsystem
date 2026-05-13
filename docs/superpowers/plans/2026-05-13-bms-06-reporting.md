# Reporting & Month Close Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monthly close workflow — lock/unlock periods, generate cash and management profit report snapshots, CSV export, and a dashboard reports page.

**Architecture:** `MonthlyPeriod` drives the lock lifecycle. A `ReportSnapshot` stores the computed JSON at lock time. Report computation is a pure function that aggregates transactions by category type. CSV export streams directly from snapshot data. Locking prevents further transaction edits for the period.

**Tech Stack:** Hono 4, Prisma 6, Next.js 15 App Router, papaparse (CSV), Vitest

---

## File Structure

| File | Purpose |
|------|---------|
| `apps/api/src/lib/report-engine.ts` | Pure function: aggregate transactions → cash/profit report |
| `apps/api/src/lib/csv-export.ts` | Pure function: report snapshot → CSV string |
| `apps/api/src/controllers/period.controller.ts` | Period CRUD + lock/unlock + report generation |
| `apps/api/src/routes/period.routes.ts` | Route registration |
| `apps/api/src/routes/index.ts` | ← add `registerPeriodRoutes` |
| `apps/api/__tests__/period.test.ts` | Integration tests |
| `apps/web/app/dashboard/reports/page.tsx` | Dashboard reports list + period status |
| `apps/web/app/dashboard/reports/[periodId]/page.tsx` | Report detail with CSV download link |

---

### Task 1: Report engine and CSV export (pure functions)

**Files:**
- Create: `apps/api/src/lib/report-engine.ts`
- Create: `apps/api/src/lib/csv-export.ts`

**Report structure:**
```typescript
type ReportSnapshot = {
  businessId: string
  year: number
  month: number
  generatedAt: string  // ISO string
  totalRevenueCents: number
  totalExpenseCents: number
  netProfitCents: number
  revenueByCategory: { categoryId: string; name: string; amountCents: number }[]
  expenseByCategory: { categoryId: string; name: string; amountCents: number }[]
  uncategorisedRevenueCents: number
  uncategorisedExpenseCents: number
  transactionCount: number
}
```

**Transaction inclusion rules:**
- Include only transactions where `reviewStatus === 'REVIEWED'`
- Exclude transactions where `isPersonal === true`
- For revenue: `transactionType === 'REVENUE'`
- For expenses: `transactionType === 'EXPENSE'`

**CSV format** (comma-separated, header row):
```
Date,Description,Amount (ZAR),Category,Direction,Status
```

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/api/__tests__/report-engine.test.ts
import { describe, it, expect } from 'vitest'
import { buildReport } from '../src/lib/report-engine'
import { reportToCsv } from '../src/lib/csv-export'

const BUSINESS_ID = 'biz-1'
const YEAR = 2024
const MONTH = 3

const baseTx = {
  id: 't1',
  businessId: BUSINESS_ID,
  transactionDate: new Date('2024-03-10'),
  rawDescription: 'PICK N PAY',
  cleanDescription: 'PICK N PAY',
  amountCents: 5000,
  direction: 'DEBIT' as const,
  transactionType: 'EXPENSE' as const,
  reviewStatus: 'REVIEWED' as const,
  isPersonal: false,
  category: { id: 'cat-1', name: 'Groceries' },
}

describe('buildReport', () => {
  it('totals expenses correctly', () => {
    const report = buildReport(BUSINESS_ID, YEAR, MONTH, [baseTx])
    expect(report.totalExpenseCents).toBe(5000)
    expect(report.totalRevenueCents).toBe(0)
    expect(report.netProfitCents).toBe(-5000)
  })

  it('totals revenue correctly', () => {
    const revTx = { ...baseTx, id: 't2', transactionType: 'REVENUE' as const, direction: 'CREDIT' as const, category: { id: 'cat-2', name: 'Sales' } }
    const report = buildReport(BUSINESS_ID, YEAR, MONTH, [revTx])
    expect(report.totalRevenueCents).toBe(5000)
    expect(report.netProfitCents).toBe(5000)
  })

  it('excludes personal transactions', () => {
    const personal = { ...baseTx, isPersonal: true }
    const report = buildReport(BUSINESS_ID, YEAR, MONTH, [personal])
    expect(report.totalExpenseCents).toBe(0)
    expect(report.transactionCount).toBe(0)
  })

  it('excludes NEEDS_REVIEW transactions', () => {
    const unreviewed = { ...baseTx, reviewStatus: 'NEEDS_REVIEW' as const }
    const report = buildReport(BUSINESS_ID, YEAR, MONTH, [unreviewed])
    expect(report.totalExpenseCents).toBe(0)
  })

  it('groups expenses by category', () => {
    const tx2 = { ...baseTx, id: 't3', amountCents: 3000 }
    const report = buildReport(BUSINESS_ID, YEAR, MONTH, [baseTx, tx2])
    expect(report.expenseByCategory).toHaveLength(1)
    expect(report.expenseByCategory[0].amountCents).toBe(8000)
  })

  it('tracks uncategorised expenses separately', () => {
    const noCategory = { ...baseTx, id: 't4', category: null }
    const report = buildReport(BUSINESS_ID, YEAR, MONTH, [noCategory])
    expect(report.uncategorisedExpenseCents).toBe(5000)
    expect(report.expenseByCategory).toHaveLength(0)
  })
})

describe('reportToCsv', () => {
  it('returns a string with a header row', () => {
    const report = buildReport(BUSINESS_ID, YEAR, MONTH, [baseTx])
    const csv = reportToCsv(report, [baseTx])
    expect(typeof csv).toBe('string')
    expect(csv.split('\n')[0]).toContain('Date')
  })

  it('includes one data row per transaction', () => {
    const report = buildReport(BUSINESS_ID, YEAR, MONTH, [baseTx])
    const csv = reportToCsv(report, [baseTx])
    const rows = csv.trim().split('\n')
    expect(rows).toHaveLength(2) // header + 1 data row
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm vitest run __tests__/report-engine.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the report engine**

```typescript
// apps/api/src/lib/report-engine.ts

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
```

- [ ] **Step 4: Write the CSV export**

```typescript
// apps/api/src/lib/csv-export.ts
import type { ReportSnapshotData, ReportTransaction } from './report-engine'

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function reportToCsv(
  _report: ReportSnapshotData,
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
  return [header, ...rows].join('\n')
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd apps/api && pnpm vitest run __tests__/report-engine.test.ts
```

Expected: 8/8 PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/report-engine.ts apps/api/src/lib/csv-export.ts apps/api/__tests__/report-engine.test.ts
git commit -m "feat(reports): report engine and CSV export (pure functions)"
```

---

### Task 2: Period controller and routes

**Files:**
- Create: `apps/api/src/controllers/period.controller.ts`
- Create: `apps/api/src/routes/period.routes.ts`
- Modify: `apps/api/src/routes/index.ts`

**Endpoints:**

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/periods` | session | any | List periods for a business (query: businessId required) |
| POST | `/periods` | session | FINANCE_MANAGER+ | Create or get period for businessId+year+month |
| POST | `/periods/:id/lock` | session | FINANCE_MANAGER+ | Lock period, generate + store snapshot |
| POST | `/periods/:id/unlock` | session | TENANT_OWNER | Unlock period with reason, log event |
| GET | `/periods/:id/report` | session | any | Return stored snapshot JSON |
| GET | `/periods/:id/export` | session | any | Return CSV of period transactions |

**Lock flow:**
1. Validate period exists and is OPEN
2. Fetch all transactions for period's business+year+month date range
3. Call `buildReport(...)` 
4. Upsert `ReportSnapshot` with computed JSON
5. Update `MonthlyPeriod.status = LOCKED`, `lockedAt = now()`, `lockedById = user.id`
6. Log `MonthlyPeriodEvent { action: 'LOCKED' }`
7. All in a single `prisma.$transaction()`

**Date range for transactions in a period:** year/month → first day to last day inclusive (use `new Date(year, month - 1, 1)` and `new Date(year, month, 0, 23, 59, 59, 999)` for UTC safety in Prisma).

**Unlock:** Only TENANT_OWNER. Requires `reason` in body. Logs `MonthlyPeriodEvent { action: 'UNLOCKED', reason }`. Sets `status = OPEN`, clears `lockedAt`.

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/api/__tests__/period.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createApp } from '../src/app'
import { prisma, UserRole } from '@bms/db'
import { hashPassword } from '../src/lib/password'

const app = createApp()
const TEST_EMAIL = `period-test-${Date.now()}@kgolaentle.com`
const TEST_PASSWORD = 'PeriodPass123!'

let tenantId: string
let businessId: string
let bankAccountId: string
let sessionToken: string
let periodId: string

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { name: 'Period Test Tenant', slug: `period-test-${Date.now()}` },
  })
  tenantId = tenant.id

  const biz = await prisma.business.create({
    data: { tenantId, name: 'Period Biz', slug: 'period-biz' },
  })
  businessId = biz.id

  const ba = await prisma.bankAccount.create({
    data: { tenantId, nickname: 'Period Bank', bankName: 'Standard Bank', accountType: 'Business Cheque' },
  })
  bankAccountId = ba.id

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: TEST_EMAIL,
      passwordHash: await hashPassword(TEST_PASSWORD),
      name: 'Finance Lead',
      role: UserRole.TENANT_OWNER,
    },
  })

  const loginRes = await app.request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  const { token } = await loginRes.json()
  sessionToken = token
})

afterAll(async () => {
  if (periodId) {
    await prisma.monthlyPeriodEvent.deleteMany({ where: { periodId } })
    await prisma.reportSnapshot.deleteMany({ where: { periodId } })
    await prisma.monthlyPeriod.deleteMany({ where: { id: periodId } })
  }
  if (bankAccountId) {
    const importIds = await prisma.statementImport
      .findMany({ where: { bankAccountId }, select: { id: true } })
      .then((r) => r.map((x) => x.id))
    await prisma.statementImportRow.deleteMany({ where: { importId: { in: importIds } } })
    await prisma.transaction.deleteMany({ where: { bankAccountId } })
    await prisma.statementImport.deleteMany({ where: { bankAccountId } })
  }
  await prisma.session.deleteMany({ where: { user: { tenantId } } })
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.business.deleteMany({ where: { id: businessId } })
  await prisma.bankAccount.deleteMany({ where: { id: bankAccountId } })
  await prisma.tenant.deleteMany({ where: { id: tenantId } })
  await prisma.$disconnect()
})

describe('POST /periods', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, year: 2024, month: 3 }),
    })
    expect(res.status).toBe(401)
  })

  it('creates a period', async () => {
    const res = await app.request('/periods', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, year: 2024, month: 3 }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as { period: { id: string; status: string } }
    expect(body.period.status).toBe('OPEN')
    periodId = body.period.id
  })

  it('returns same period on duplicate create', async () => {
    const res = await app.request('/periods', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, year: 2024, month: 3 }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { period: { id: string } }
    expect(body.period.id).toBe(periodId)
  })
})

describe('GET /periods', () => {
  it('lists periods for a business', async () => {
    const res = await app.request(`/periods?businessId=${businessId}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { periods: unknown[] }
    expect(body.periods.length).toBeGreaterThan(0)
  })
})

describe('POST /periods/:id/lock', () => {
  it('locks the period and returns snapshot', async () => {
    const res = await app.request(`/periods/${periodId}/lock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { period: { status: string }; snapshot: { netProfitCents: number } }
    expect(body.period.status).toBe('LOCKED')
    expect(typeof body.snapshot.netProfitCents).toBe('number')
  })
})

describe('GET /periods/:id/report', () => {
  it('returns the stored snapshot', async () => {
    const res = await app.request(`/periods/${periodId}/report`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { snapshot: { totalRevenueCents: number } }
    expect(typeof body.snapshot.totalRevenueCents).toBe('number')
  })
})

describe('GET /periods/:id/export', () => {
  it('returns CSV content-type', async () => {
    const res = await app.request(`/periods/${periodId}/export`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
  })
})

describe('POST /periods/:id/unlock', () => {
  it('requires reason', async () => {
    const res = await app.request(`/periods/${periodId}/unlock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('unlocks the period', async () => {
    const res = await app.request(`/periods/${periodId}/unlock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Correction needed' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { period: { status: string } }
    expect(body.period.status).toBe('OPEN')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm vitest run __tests__/period.test.ts
```

Expected: FAIL (routes not registered yet)

- [ ] **Step 3: Write the period controller**

```typescript
// apps/api/src/controllers/period.controller.ts
import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { prisma } from '@bms/db'
import { buildReport, type ReportTransaction } from '../lib/report-engine'
import { reportToCsv } from '../lib/csv-export'

const FINANCE_ROLES = ['TENANT_OWNER', 'FINANCE_MANAGER']

export async function listPeriods(c: Context<AppEnv>) {
  const { businessId } = c.req.query()
  if (!businessId) return c.json({ error: 'businessId query param required' }, 400)

  try {
    const periods = await prisma.monthlyPeriod.findMany({
      where: { businessId },
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

export async function lockPeriod(c: Context<AppEnv>) {
  const { id } = c.req.param()
  const user = c.get('user')
  if (!FINANCE_ROLES.includes(user.role)) return c.json({ error: 'Forbidden' }, 403)

  try {
    const period = await prisma.monthlyPeriod.findUnique({ where: { id } })
    if (!period) return c.json({ error: 'Not found' }, 404)
    if (period.status === 'LOCKED') return c.json({ error: 'Period is already locked' }, 409)

    const from = new Date(period.year, period.month - 1, 1)
    const to = new Date(period.year, period.month, 0, 23, 59, 59, 999)

    const transactions = await prisma.transaction.findMany({
      where: {
        businessId: period.businessId,
        transactionDate: { gte: from, lte: to },
      },
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

    const [updatedPeriod, snapshot] = await prisma.$transaction([
      prisma.monthlyPeriod.update({
        where: { id },
        data: { status: 'LOCKED', lockedAt: new Date(), lockedById: user.id },
      }),
      prisma.reportSnapshot.upsert({
        where: { periodId: id },
        create: { periodId: id, snapshotJson: snapshotData as never },
        update: { snapshotJson: snapshotData as never },
      }),
      prisma.monthlyPeriodEvent.create({
        data: { periodId: id, actorId: user.id, action: 'LOCKED' },
      }),
    ])

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
    const period = await prisma.monthlyPeriod.findUnique({ where: { id } })
    if (!period) return c.json({ error: 'Not found' }, 404)
    if (period.status === 'OPEN') return c.json({ error: 'Period is already open' }, 409)

    const [updatedPeriod] = await prisma.$transaction([
      prisma.monthlyPeriod.update({
        where: { id },
        data: { status: 'OPEN', lockedAt: null },
      }),
      prisma.monthlyPeriodEvent.create({
        data: { periodId: id, actorId: user.id, action: 'UNLOCKED', reason: body.reason },
      }),
    ])

    return c.json({ period: updatedPeriod })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function getPeriodReport(c: Context<AppEnv>) {
  const { id } = c.req.param()

  try {
    const snapshot = await prisma.reportSnapshot.findUnique({ where: { periodId: id } })
    if (!snapshot) return c.json({ error: 'Report not yet generated — lock the period first' }, 404)
    return c.json({ snapshot: snapshot.snapshotJson })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function exportPeriodCsv(c: Context<AppEnv>) {
  const { id } = c.req.param()

  try {
    const [period, snapshot] = await Promise.all([
      prisma.monthlyPeriod.findUnique({ where: { id } }),
      prisma.reportSnapshot.findUnique({ where: { periodId: id } }),
    ])
    if (!period) return c.json({ error: 'Not found' }, 404)
    if (!snapshot) return c.json({ error: 'Report not yet generated — lock the period first' }, 404)

    const from = new Date(period.year, period.month - 1, 1)
    const to = new Date(period.year, period.month, 0, 23, 59, 59, 999)

    const transactions = await prisma.transaction.findMany({
      where: {
        businessId: period.businessId,
        transactionDate: { gte: from, lte: to },
      },
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

    const snapshotData = snapshot.snapshotJson as Parameters<typeof reportToCsv>[0]
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
```

- [ ] **Step 4: Write the routes file**

```typescript
// apps/api/src/routes/period.routes.ts
import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import {
  listPeriods,
  createPeriod,
  lockPeriod,
  unlockPeriod,
  getPeriodReport,
  exportPeriodCsv,
} from '../controllers/period.controller'

export function registerPeriodRoutes(app: Hono<AppEnv>) {
  app.get('/periods', sessionMiddleware, listPeriods)
  app.post('/periods', sessionMiddleware, createPeriod)
  app.post('/periods/:id/lock', sessionMiddleware, lockPeriod)
  app.post('/periods/:id/unlock', sessionMiddleware, unlockPeriod)
  app.get('/periods/:id/report', sessionMiddleware, getPeriodReport)
  app.get('/periods/:id/export', sessionMiddleware, exportPeriodCsv)
}
```

- [ ] **Step 5: Register routes in index.ts**

Add to `apps/api/src/routes/index.ts`:
```typescript
import { registerPeriodRoutes } from './period.routes'
// inside registerRoutes():
registerPeriodRoutes(app)
```

- [ ] **Step 6: Run tests**

```bash
cd apps/api && pnpm vitest run __tests__/period.test.ts
```

Expected: 10/10 PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/controllers/period.controller.ts \
        apps/api/src/routes/period.routes.ts \
        apps/api/src/routes/index.ts \
        apps/api/__tests__/period.test.ts
git commit -m "feat(reports): period CRUD, lock/unlock, snapshot, and CSV export endpoints"
```

---

### Task 3: Dashboard reports pages

**Files:**
- Create: `apps/web/app/dashboard/reports/page.tsx`
- Create: `apps/web/app/dashboard/reports/[periodId]/page.tsx`

**Reports list page** (`/dashboard/reports`): requires `?businessId=<id>` query param. Shows list of periods with year/month, status, and links to detail. Uses `apiRequestAuthenticated`.

**Report detail page** (`/dashboard/reports/[periodId]`): fetches snapshot, shows summary table (total revenue, total expenses, net profit, transaction count), and CSV download link (`/api/periods/[periodId]/export` proxied or direct API link).

- [ ] **Step 1: Write the reports list page**

```typescript
// apps/web/app/dashboard/reports/page.tsx
import { apiRequestAuthenticated } from '@/lib/api-client.server'

type Period = {
  id: string
  businessId: string
  year: number
  month: number
  status: string
  lockedAt: string | null
}
type PeriodsResponse = { periods: Period[] }

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>
}) {
  const params = await searchParams
  const businessId = params.businessId

  if (!businessId) {
    return (
      <div>
        <h1>Reports</h1>
        <p>Select a business: add <code>?businessId=&lt;id&gt;</code> to the URL.</p>
      </div>
    )
  }

  const { periods } = await apiRequestAuthenticated<PeriodsResponse>(
    `/periods?businessId=${businessId}`
  )

  return (
    <div>
      <h1>Reports</h1>
      {periods.length === 0 ? (
        <p>No periods yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Status</th>
              <th>Locked At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id}>
                <td>{MONTH_NAMES[p.month - 1]} {p.year}</td>
                <td>{p.status}</td>
                <td>{p.lockedAt ? new Date(p.lockedAt).toLocaleDateString('en-ZA') : '—'}</td>
                <td>
                  <a href={`/dashboard/reports/${p.id}`}>View report</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write the report detail page**

```typescript
// apps/web/app/dashboard/reports/[periodId]/page.tsx
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

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ periodId: string }>
}) {
  const { periodId } = await params
  const { snapshot } = await apiRequestAuthenticated<ReportResponse>(
    `/periods/${periodId}/report`
  )

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
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

      <a
        href={`${API_BASE}/periods/${periodId}/export`}
        download
      >
        Download CSV
      </a>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/dashboard/reports/
git commit -m "feat(web): dashboard reports list and report detail pages"
```

---

## Test count summary

| Plan | Tests added |
|------|------------|
| After Plan 5 | ~61 |
| Plan 6 Task 1 | +8 (report engine + CSV unit tests) |
| Plan 6 Task 2 | +10 (period API integration tests) |
| **After Plan 6** | **~79** |
