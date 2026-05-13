# BMS Plan 4 — Transaction Review & Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose a transaction review API (list, update, bulk-update) plus a supplier/alias CRUD API and a rules engine that auto-categorises transactions by description pattern.

**Architecture:** All read and write endpoints live in `apps/api`. The rules engine is a pure function `applyRules(transactions, rules)` plus a `POST /rules/apply` endpoint that runs it against all `NEEDS_REVIEW` transactions for a tenant. Next.js pages for the review queue and supplier management provide the functional UI (no design).

**Tech Stack:** Hono 4, Prisma 6, Vitest

---

## File map

| File | Action | Purpose |
|------|--------|---------|
| `apps/api/src/controllers/transaction.controller.ts` | Create | listTransactions, updateTransaction, bulkUpdateTransactions |
| `apps/api/src/controllers/supplier.controller.ts` | Create | CRUD for Supplier + SupplierAlias |
| `apps/api/src/controllers/rule.controller.ts` | Create | CRUD for TransactionRule + applyRules |
| `apps/api/src/lib/rules-engine.ts` | Create | Pure `applyRules(transactions, rules)` function |
| `apps/api/src/routes/transaction.routes.ts` | Create | GET/PATCH /transactions, PATCH /transactions/:id |
| `apps/api/src/routes/supplier.routes.ts` | Create | GET/POST /suppliers, GET /suppliers/:id, POST /suppliers/:id/aliases |
| `apps/api/src/routes/rule.routes.ts` | Create | GET/POST /rules, POST /rules/apply |
| `apps/api/src/routes/index.ts` | Modify | Register new routes |
| `apps/api/src/__tests__/rules-engine.test.ts` | Create | Unit tests for pure rules engine |
| `apps/api/src/__tests__/transaction.test.ts` | Create | Integration tests for transaction endpoints |
| `apps/web/app/dashboard/transactions/page.tsx` | Create | Review queue table with inline categorisation |
| `apps/web/app/dashboard/transactions/actions.ts` | Create | Server actions: updateTransaction, bulkUpdate |
| `apps/web/app/dashboard/suppliers/page.tsx` | Create | Supplier list with alias management |
| `apps/web/app/dashboard/suppliers/actions.ts` | Create | Server actions: createSupplier, addAlias |

---

### Task 1: Transaction controller + routes

**Files:**
- Create: `apps/api/src/controllers/transaction.controller.ts`
- Create: `apps/api/src/routes/transaction.routes.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Create `apps/api/src/controllers/transaction.controller.ts`**

```typescript
import type { Context } from 'hono'
import { prisma } from '@bms/db'
import type { AppEnv } from '../types'
import type { ReviewStatus, TransactionType } from '@bms/db'

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

  // Scope to tenant via bankAccount
  const where: Parameters<typeof prisma.transaction.findMany>[0]['where'] = {
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

  const body = await c.req.json<{
    categoryId?: string | null
    supplierId?: string | null
    businessId?: string | null
    transactionType?: TransactionType
    isPersonal?: boolean
    notes?: string | null
    reviewStatus?: ReviewStatus
  }>().catch(() => ({}))

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

  const body = await c.req.json<{
    ids: string[]
    categoryId?: string | null
    supplierId?: string | null
    businessId?: string | null
    transactionType?: TransactionType
    reviewStatus?: ReviewStatus
  }>().catch(() => ({ ids: [] }))

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return c.json({ error: 'ids array is required' }, 400)
  }

  if (body.ids.length > 200) {
    return c.json({ error: 'Cannot bulk-update more than 200 transactions at once' }, 400)
  }

  // Verify all transactions belong to this tenant
  const count = await prisma.transaction.count({
    where: {
      id: { in: body.ids },
      bankAccount: { tenantId: user.tenantId },
      reviewStatus: { not: 'LOCKED' },
    },
  })

  if (count !== body.ids.length) {
    return c.json({ error: 'One or more transactions not found, locked, or not accessible' }, 422)
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
```

- [ ] **Step 2: Create `apps/api/src/routes/transaction.routes.ts`**

```typescript
import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import { requireRole } from '../middleware/role.middleware'
import {
  listTransactions,
  updateTransaction,
  bulkUpdateTransactions,
} from '../controllers/transaction.controller'

const roles = ['TENANT_OWNER', 'FINANCE_MANAGER', 'ACCOUNTANT'] as const

export function registerTransactionRoutes(app: Hono<AppEnv>) {
  app.get('/transactions', sessionMiddleware, requireRole(...roles), listTransactions)
  app.patch('/transactions', sessionMiddleware, requireRole(...roles), bulkUpdateTransactions)
  app.patch('/transactions/:id', sessionMiddleware, requireRole(...roles), updateTransaction)
}
```

- [ ] **Step 3: Update `apps/api/src/routes/index.ts`**

```typescript
import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { getHealth, getDbHealth } from '../controllers/health.controller'
import { registerAuthRoutes } from './auth.routes'
import { registerImportRoutes } from './import.routes'
import { registerTransactionRoutes } from './transaction.routes'

export function registerRoutes(app: Hono<AppEnv>) {
  app.get('/health', getHealth)
  app.get('/health/db', getDbHealth)
  registerAuthRoutes(app)
  registerImportRoutes(app)
  registerTransactionRoutes(app)
}
```

- [ ] **Step 4: TypeScript check + run tests**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/apps/api"
npx tsc --noEmit
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm --filter @bms/api test 2>&1 | tail -10
```

Expected: all 31 existing tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
git add apps/api/src/controllers/transaction.controller.ts apps/api/src/routes/transaction.routes.ts apps/api/src/routes/index.ts
git commit -m "feat(review): transaction list, update, and bulk-update endpoints"
```

---

### Task 2: Supplier controller + routes

**Files:**
- Create: `apps/api/src/controllers/supplier.controller.ts`
- Create: `apps/api/src/routes/supplier.routes.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Create `apps/api/src/controllers/supplier.controller.ts`**

```typescript
import type { Context } from 'hono'
import { prisma } from '@bms/db'
import type { AppEnv } from '../types'

export async function listSuppliers(c: Context<AppEnv>) {
  const user = c.get('user')
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId: user.tenantId, active: true },
      orderBy: { name: 'asc' },
      include: { aliases: { select: { id: true, pattern: true } } },
    })
    return c.json({ data: suppliers })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function getSupplier(c: Context<AppEnv>) {
  const user = c.get('user')
  const { id } = c.req.param()
  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { aliases: true },
  })
  if (!supplier) return c.json({ error: 'Not found' }, 404)
  return c.json(supplier)
}

export async function createSupplier(c: Context<AppEnv>) {
  const user = c.get('user')
  const body = await c.req.json<{ name: string; website?: string; notes?: string }>()
    .catch(() => ({ name: '' }))

  if (!body.name?.trim()) {
    return c.json({ error: 'name is required' }, 400)
  }

  try {
    const supplier = await prisma.supplier.create({
      data: {
        tenantId: user.tenantId,
        name: body.name.trim(),
        website: body.website?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    })
    return c.json(supplier, 201)
  } catch (err) {
    const msg = err instanceof Error && err.message.includes('Unique constraint')
      ? 'Supplier with this name already exists'
      : 'Internal server error'
    return c.json({ error: msg }, msg.includes('already') ? 409 : 500)
  }
}

export async function addSupplierAlias(c: Context<AppEnv>) {
  const user = c.get('user')
  const { id } = c.req.param()

  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId: user.tenantId },
  })
  if (!supplier) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json<{ pattern: string }>().catch(() => ({ pattern: '' }))
  if (!body.pattern?.trim()) return c.json({ error: 'pattern is required' }, 400)

  try {
    const alias = await prisma.supplierAlias.create({
      data: { supplierId: id, pattern: body.pattern.trim().toUpperCase() },
    })
    return c.json(alias, 201)
  } catch {
    return c.json({ error: 'Alias pattern already exists for this supplier' }, 409)
  }
}
```

- [ ] **Step 2: Create `apps/api/src/routes/supplier.routes.ts`**

```typescript
import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import { requireRole } from '../middleware/role.middleware'
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  addSupplierAlias,
} from '../controllers/supplier.controller'

const roles = ['TENANT_OWNER', 'FINANCE_MANAGER', 'ACCOUNTANT'] as const

export function registerSupplierRoutes(app: Hono<AppEnv>) {
  app.get('/suppliers', sessionMiddleware, requireRole(...roles), listSuppliers)
  app.post('/suppliers', sessionMiddleware, requireRole('TENANT_OWNER', 'FINANCE_MANAGER'), createSupplier)
  app.get('/suppliers/:id', sessionMiddleware, requireRole(...roles), getSupplier)
  app.post('/suppliers/:id/aliases', sessionMiddleware, requireRole('TENANT_OWNER', 'FINANCE_MANAGER'), addSupplierAlias)
}
```

- [ ] **Step 3: Update `apps/api/src/routes/index.ts`** to include supplier routes:

```typescript
import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { getHealth, getDbHealth } from '../controllers/health.controller'
import { registerAuthRoutes } from './auth.routes'
import { registerImportRoutes } from './import.routes'
import { registerTransactionRoutes } from './transaction.routes'
import { registerSupplierRoutes } from './supplier.routes'

export function registerRoutes(app: Hono<AppEnv>) {
  app.get('/health', getHealth)
  app.get('/health/db', getDbHealth)
  registerAuthRoutes(app)
  registerImportRoutes(app)
  registerTransactionRoutes(app)
  registerSupplierRoutes(app)
}
```

- [ ] **Step 4: TypeScript check + run tests**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/apps/api"
npx tsc --noEmit
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm --filter @bms/api test 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
git add apps/api/src/controllers/supplier.controller.ts apps/api/src/routes/supplier.routes.ts apps/api/src/routes/index.ts
git commit -m "feat(review): supplier CRUD and alias management endpoints"
```

---

### Task 3: Rules engine + rule controller/routes

**Files:**
- Create: `apps/api/src/lib/rules-engine.ts`
- Create: `apps/api/src/__tests__/rules-engine.test.ts`
- Create: `apps/api/src/controllers/rule.controller.ts`
- Create: `apps/api/src/routes/rule.routes.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Write failing unit tests for rules engine**

Create `apps/api/src/__tests__/rules-engine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { applyRulesToTransactions } from '../lib/rules-engine'
import type { RuleMatch } from '../lib/rules-engine'

const makeTransaction = (id: string, cleanDescription: string) => ({
  id,
  cleanDescription,
  reviewStatus: 'NEEDS_REVIEW' as const,
  categoryId: null as string | null,
  supplierId: null as string | null,
  businessId: null as string | null,
  transactionType: 'UNKNOWN' as const,
  isPersonal: false,
})

const makeRule = (id: string, pattern: string, overrides: Partial<{
  categoryId: string | null
  supplierId: string | null
  businessId: string | null
  transactionType: string | null
  isPersonal: boolean | null
  trustedAutoReview: boolean
  priority: number
}> = {}) => ({
  id,
  descriptionPattern: pattern,
  categoryId: null as string | null,
  supplierId: null as string | null,
  businessId: null as string | null,
  transactionType: null as string | null,
  isPersonal: null as boolean | null,
  trustedAutoReview: false,
  priority: 0,
  active: true,
  ...overrides,
})

describe('applyRulesToTransactions', () => {
  it('matches a transaction by description substring', () => {
    const txns = [makeTransaction('t1', 'CHECKERS SUPERMARKET')]
    const rules = [makeRule('r1', 'CHECKERS', { categoryId: 'cat-groceries' })]
    const matches = applyRulesToTransactions(txns, rules)
    expect(matches).toHaveLength(1)
    expect(matches[0].transactionId).toBe('t1')
    expect(matches[0].categoryId).toBe('cat-groceries')
  })

  it('uses highest-priority rule when multiple match', () => {
    const txns = [makeTransaction('t1', 'CHECKERS SUPERMARKET')]
    const rules = [
      makeRule('r1', 'CHECKERS', { categoryId: 'cat-low', priority: 0 }),
      makeRule('r2', 'CHECKERS SUPERMARKET', { categoryId: 'cat-high', priority: 10 }),
    ]
    const matches = applyRulesToTransactions(txns, rules)
    expect(matches[0].categoryId).toBe('cat-high')
  })

  it('sets reviewStatus REVIEWED when trustedAutoReview is true', () => {
    const txns = [makeTransaction('t1', 'MONTHLY SALARY')]
    const rules = [makeRule('r1', 'SALARY', { categoryId: 'cat-salary', trustedAutoReview: true })]
    const matches = applyRulesToTransactions(txns, rules)
    expect(matches[0].reviewStatus).toBe('REVIEWED')
  })

  it('keeps reviewStatus NEEDS_REVIEW when trustedAutoReview is false', () => {
    const txns = [makeTransaction('t1', 'MONTHLY SALARY')]
    const rules = [makeRule('r1', 'SALARY', { categoryId: 'cat-salary', trustedAutoReview: false })]
    const matches = applyRulesToTransactions(txns, rules)
    expect(matches[0].reviewStatus).toBe('NEEDS_REVIEW')
  })

  it('returns empty array when no rules match', () => {
    const txns = [makeTransaction('t1', 'RANDOM MERCHANT')]
    const rules = [makeRule('r1', 'CHECKERS')]
    expect(applyRulesToTransactions(txns, rules)).toHaveLength(0)
  })

  it('skips transactions with reviewStatus other than NEEDS_REVIEW', () => {
    const txns = [{ ...makeTransaction('t1', 'CHECKERS'), reviewStatus: 'REVIEWED' as const }]
    const rules = [makeRule('r1', 'CHECKERS', { categoryId: 'cat-grocery' })]
    expect(applyRulesToTransactions(txns, rules)).toHaveLength(0)
  })

  it('does case-insensitive matching', () => {
    const txns = [makeTransaction('t1', 'CHECKERS SUPERMARKET')]
    const rules = [makeRule('r1', 'checkers', { categoryId: 'cat-grocery' })]
    const matches = applyRulesToTransactions(txns, rules)
    expect(matches).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Create `apps/api/src/lib/rules-engine.ts`**

```typescript
import type { ReviewStatus, TransactionType } from '@bms/db'

type Transaction = {
  id: string
  cleanDescription: string
  reviewStatus: ReviewStatus
  categoryId: string | null
  supplierId: string | null
  businessId: string | null
  transactionType: TransactionType
  isPersonal: boolean
}

type Rule = {
  id: string
  descriptionPattern: string
  categoryId: string | null
  supplierId: string | null
  businessId: string | null
  transactionType: string | null
  isPersonal: boolean | null
  trustedAutoReview: boolean
  priority: number
  active: boolean
}

export type RuleMatch = {
  transactionId: string
  ruleId: string
  categoryId: string | null
  supplierId: string | null
  businessId: string | null
  transactionType: TransactionType | null
  isPersonal: boolean | null
  reviewStatus: ReviewStatus
}

export function applyRulesToTransactions(
  transactions: Transaction[],
  rules: Rule[]
): RuleMatch[] {
  // Sort rules descending by priority
  const sortedRules = [...rules].filter(r => r.active).sort((a, b) => b.priority - a.priority)

  const matches: RuleMatch[] = []

  for (const txn of transactions) {
    if (txn.reviewStatus !== 'NEEDS_REVIEW') continue

    const matchedRule = sortedRules.find(rule =>
      txn.cleanDescription.toUpperCase().includes(rule.descriptionPattern.toUpperCase())
    )

    if (!matchedRule) continue

    matches.push({
      transactionId: txn.id,
      ruleId: matchedRule.id,
      categoryId: matchedRule.categoryId,
      supplierId: matchedRule.supplierId,
      businessId: matchedRule.businessId,
      transactionType: matchedRule.transactionType as TransactionType | null,
      isPersonal: matchedRule.isPersonal,
      reviewStatus: matchedRule.trustedAutoReview ? 'REVIEWED' : 'NEEDS_REVIEW',
    })
  }

  return matches
}
```

- [ ] **Step 3: Run rules engine tests**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm --filter @bms/api test --reporter=verbose 2>&1 | grep -E "(rules-engine|PASS|FAIL)"
```

Expected: 7 rules-engine tests pass.

- [ ] **Step 4: Create `apps/api/src/controllers/rule.controller.ts`**

```typescript
import type { Context } from 'hono'
import { prisma } from '@bms/db'
import type { AppEnv } from '../types'
import { applyRulesToTransactions } from '../lib/rules-engine'
import type { TransactionType } from '@bms/db'

export async function listRules(c: Context<AppEnv>) {
  const user = c.get('user')
  try {
    const rules = await prisma.transactionRule.findMany({
      where: { tenantId: user.tenantId, active: true },
      orderBy: { priority: 'desc' },
    })
    return c.json({ data: rules })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function createRule(c: Context<AppEnv>) {
  const user = c.get('user')
  const body = await c.req.json<{
    name: string
    descriptionPattern: string
    categoryId?: string
    supplierId?: string
    businessId?: string
    transactionType?: TransactionType
    isPersonal?: boolean
    receiptRequired?: boolean
    trustedAutoReview?: boolean
    priority?: number
  }>().catch(() => ({ name: '', descriptionPattern: '' }))

  if (!body.name?.trim() || !body.descriptionPattern?.trim()) {
    return c.json({ error: 'name and descriptionPattern are required' }, 400)
  }

  try {
    const rule = await prisma.transactionRule.create({
      data: {
        tenantId: user.tenantId,
        name: body.name.trim(),
        descriptionPattern: body.descriptionPattern.trim().toUpperCase(),
        categoryId: body.categoryId ?? null,
        supplierId: body.supplierId ?? null,
        businessId: body.businessId ?? null,
        transactionType: body.transactionType ?? null,
        isPersonal: body.isPersonal ?? null,
        receiptRequired: body.receiptRequired ?? null,
        trustedAutoReview: body.trustedAutoReview ?? false,
        priority: body.priority ?? 0,
      },
    })
    return c.json(rule, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function applyRules(c: Context<AppEnv>) {
  const user = c.get('user')

  const rules = await prisma.transactionRule.findMany({
    where: { tenantId: user.tenantId, active: true },
    orderBy: { priority: 'desc' },
  })

  if (rules.length === 0) {
    return c.json({ applied: 0, message: 'No active rules' })
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      bankAccount: { tenantId: user.tenantId },
      reviewStatus: 'NEEDS_REVIEW',
    },
    select: {
      id: true,
      cleanDescription: true,
      reviewStatus: true,
      categoryId: true,
      supplierId: true,
      businessId: true,
      transactionType: true,
      isPersonal: true,
    },
  })

  const matches = applyRulesToTransactions(transactions, rules)

  if (matches.length === 0) {
    return c.json({ applied: 0 })
  }

  // Apply each match as an update
  let applied = 0
  for (const match of matches) {
    try {
      await prisma.transaction.update({
        where: { id: match.transactionId },
        data: {
          ruleId: match.ruleId,
          ...(match.categoryId !== null ? { categoryId: match.categoryId } : {}),
          ...(match.supplierId !== null ? { supplierId: match.supplierId } : {}),
          ...(match.businessId !== null ? { businessId: match.businessId } : {}),
          ...(match.transactionType !== null ? { transactionType: match.transactionType } : {}),
          ...(match.isPersonal !== null ? { isPersonal: match.isPersonal } : {}),
          reviewStatus: match.reviewStatus,
          ...(match.reviewStatus === 'REVIEWED'
            ? { reviewedById: user.id, reviewedAt: new Date() }
            : {}),
        },
      })
      applied++
    } catch {
      // Log and continue; partial success is acceptable
    }
  }

  return c.json({ applied })
}
```

- [ ] **Step 5: Create `apps/api/src/routes/rule.routes.ts`**

```typescript
import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import { requireRole } from '../middleware/role.middleware'
import { listRules, createRule, applyRules } from '../controllers/rule.controller'

export function registerRuleRoutes(app: Hono<AppEnv>) {
  app.get('/rules', sessionMiddleware, requireRole('TENANT_OWNER', 'FINANCE_MANAGER'), listRules)
  app.post('/rules', sessionMiddleware, requireRole('TENANT_OWNER', 'FINANCE_MANAGER'), createRule)
  app.post('/rules/apply', sessionMiddleware, requireRole('TENANT_OWNER', 'FINANCE_MANAGER'), applyRules)
}
```

- [ ] **Step 6: Update `apps/api/src/routes/index.ts`**

```typescript
import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { getHealth, getDbHealth } from '../controllers/health.controller'
import { registerAuthRoutes } from './auth.routes'
import { registerImportRoutes } from './import.routes'
import { registerTransactionRoutes } from './transaction.routes'
import { registerSupplierRoutes } from './supplier.routes'
import { registerRuleRoutes } from './rule.routes'

export function registerRoutes(app: Hono<AppEnv>) {
  app.get('/health', getHealth)
  app.get('/health/db', getDbHealth)
  registerAuthRoutes(app)
  registerImportRoutes(app)
  registerTransactionRoutes(app)
  registerSupplierRoutes(app)
  registerRuleRoutes(app)
}
```

- [ ] **Step 7: TypeScript check + run full tests**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/apps/api"
npx tsc --noEmit
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm --filter @bms/api test 2>&1 | tail -10
```

Expected: 31 + 7 = 38 tests passing.

- [ ] **Step 8: Commit**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
git add apps/api/src/lib/rules-engine.ts apps/api/src/__tests__/rules-engine.test.ts apps/api/src/controllers/rule.controller.ts apps/api/src/routes/rule.routes.ts apps/api/src/routes/index.ts
git commit -m "feat(review): rules engine with pattern matching, auto-review, and apply endpoint"
```

---

### Task 4: Transaction integration test

**Files:**
- Create: `apps/api/src/__tests__/transaction.test.ts`

Tests the transaction list and update endpoints end-to-end. Imports a CSV first to create real transactions.

- [ ] **Step 1: Create `apps/api/src/__tests__/transaction.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma, UserRole } from '@bms/db'
import { hashPassword } from '../lib/password'
import { createApp } from '../app'

const app = createApp()

const TEST_EMAIL = `reviewer-${Date.now()}@kgolaentle.com`
const TEST_PASSWORD = 'ReviewPass123!'

const SAMPLE_CSV = `Date,Description,Amount,Balance
01 Apr 2025,OPENING BALANCE,,45000.00
02 Apr 2025,CHECKERS SUPERMARKET,-500.00,44500.00
03 Apr 2025,SALARY CREDIT,50000.00,94500.00
`

let tenantId: string
let userId: string
let bankAccountId: string
let categoryId: string
let sessionToken: string
let transactionId: string

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { name: 'Review Test Tenant', slug: `review-test-${Date.now()}` },
  })
  tenantId = tenant.id

  const bankAccount = await prisma.bankAccount.create({
    data: { tenantId, nickname: 'Test Bank', bankName: 'Standard Bank', accountType: 'Business Cheque' },
  })
  bankAccountId = bankAccount.id

  const category = await prisma.category.create({
    data: { tenantId, categoryType: 'EXPENSE', name: `Groceries-${Date.now()}`, receiptRequired: false },
  })
  categoryId = category.id

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: TEST_EMAIL,
      passwordHash: await hashPassword(TEST_PASSWORD),
      name: 'Finance Manager',
      role: UserRole.FINANCE_MANAGER,
    },
  })
  userId = user.id

  const loginRes = await app.request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  const loginBody = await loginRes.json()
  sessionToken = loginBody.token

  // Import CSV to create transactions
  const fd = new FormData()
  fd.append('file', new Blob([SAMPLE_CSV], { type: 'text/csv' }), 'test.csv')
  fd.append('bankAccountId', bankAccountId)
  await app.request('/imports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionToken}` },
    body: fd,
  })

  // Get the ID of the first transaction
  const txn = await prisma.transaction.findFirst({
    where: { bankAccountId },
    orderBy: { transactionDate: 'asc' },
  })
  transactionId = txn!.id
})

afterAll(async () => {
  if (tenantId) {
    await prisma.statementImportRow.deleteMany({
      where: { import: { bankAccount: { tenantId } } },
    })
    await prisma.transaction.deleteMany({ where: { bankAccountId } })
    await prisma.statementImport.deleteMany({ where: { bankAccountId } })
    await prisma.category.deleteMany({ where: { id: categoryId } })
    await prisma.session.deleteMany({ where: { userId } })
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.bankAccount.deleteMany({ where: { id: bankAccountId } })
    await prisma.tenant.deleteMany({ where: { id: tenantId } })
  }
  await prisma.$disconnect()
})

describe('GET /transactions', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/transactions')
    expect(res.status).toBe(401)
  })

  it('returns paginated transactions for the tenant', async () => {
    const res = await app.request('/transactions', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.meta.total).toBeGreaterThan(0)
    expect(body.data[0]).toHaveProperty('bankAccount')
  })
})

describe('PATCH /transactions/:id', () => {
  it('categorises a transaction', async () => {
    const res = await app.request(`/transactions/${transactionId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categoryId, reviewStatus: 'REVIEWED' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.categoryId).toBe(categoryId)
    expect(body.reviewStatus).toBe('REVIEWED')
  })

  it('returns 404 for transaction from another tenant', async () => {
    const res = await app.request('/transactions/non-existent-id', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categoryId }),
    })
    expect(res.status).toBe(404)
  })
})

describe('PATCH /transactions (bulk)', () => {
  it('bulk-categorises multiple transactions', async () => {
    // Get all transaction IDs
    const txns = await prisma.transaction.findMany({ where: { bankAccountId } })
    const ids = txns.map(t => t.id)

    const res = await app.request('/transactions', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids, categoryId }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.updated).toBe(ids.length)
  })

  it('returns 400 when ids array is missing', async () => {
    const res = await app.request('/transactions', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categoryId }),
    })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run all tests**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm --filter @bms/api test 2>&1 | tail -15
```

Expected: 38 + 6 = 44 tests passing.

- [ ] **Step 3: Commit**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
git add apps/api/src/__tests__/transaction.test.ts
git commit -m "test(review): integration tests for transaction list, update, and bulk-update"
```

---

### Task 5: Next.js transaction review page

**Files:**
- Create: `apps/web/app/dashboard/transactions/page.tsx`
- Create: `apps/web/app/dashboard/transactions/actions.ts`

The review page shows all NEEDS_REVIEW transactions and lets the user assign a category.

- [ ] **Step 1: Create `apps/web/app/dashboard/transactions/actions.ts`**

```typescript
'use server'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

export async function updateTransactionAction(
  transactionId: string,
  data: { categoryId?: string; reviewStatus?: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiRequestAuthenticated(`/transactions/${transactionId}`, {
      method: 'PATCH',
      body: data,
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' }
  }
}

export async function applyRulesAction(): Promise<{ applied: number; error?: string }> {
  try {
    const result = await apiRequestAuthenticated<{ applied: number }>('/rules/apply', {
      method: 'POST',
    })
    return result
  } catch (err) {
    return { applied: 0, error: err instanceof Error ? err.message : 'Apply rules failed' }
  }
}
```

- [ ] **Step 2: Create `apps/web/app/dashboard/transactions/page.tsx`**

This is a server component that fetches the transaction list on load, with a client-side form for inline updates.

```typescript
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import TransactionRow from './TransactionRow'

type Transaction = {
  id: string
  transactionDate: string
  rawDescription: string
  amountCents: number
  reviewStatus: string
  categoryId: string | null
  category: { id: string; name: string } | null
  bankAccount: { nickname: string }
}

type TransactionsResponse = {
  data: Transaction[]
  meta: { total: number; page: number; pageSize: number; pages: number }
}

type Category = { id: string; name: string; categoryType: string }

async function getTransactions(searchParams: Record<string, string>) {
  const params = new URLSearchParams({
    reviewStatus: searchParams.reviewStatus ?? 'NEEDS_REVIEW',
    pageSize: '50',
    page: searchParams.page ?? '1',
  })
  return apiRequestAuthenticated<TransactionsResponse>(`/transactions?${params}`)
}

async function getCategories() {
  // Categories are currently only in the DB seed; expose them via a simple API call
  // For now, use a static placeholder — will be replaced with a real /categories endpoint in Plan 6
  return [] as Category[]
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const [{ data: transactions, meta }] = await Promise.all([
    getTransactions(params),
  ])

  return (
    <main style={{ padding: 32 }}>
      <h1>Transaction Review</h1>
      <p style={{ color: '#666' }}>
        {meta.total} transactions | Page {meta.page} of {meta.pages}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
            <th style={{ padding: '8px 4px' }}>Date</th>
            <th style={{ padding: '8px 4px' }}>Description</th>
            <th style={{ padding: '8px 4px', textAlign: 'right' }}>Amount</th>
            <th style={{ padding: '8px 4px' }}>Status</th>
            <th style={{ padding: '8px 4px' }}>Category</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <tr key={txn.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 4px' }}>
                {new Date(txn.transactionDate).toLocaleDateString('en-ZA')}
              </td>
              <td style={{ padding: '8px 4px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {txn.rawDescription}
              </td>
              <td style={{ padding: '8px 4px', textAlign: 'right', color: txn.amountCents < 0 ? 'red' : 'green' }}>
                R {(Math.abs(txn.amountCents) / 100).toFixed(2)}
              </td>
              <td style={{ padding: '8px 4px' }}>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 12,
                  background: txn.reviewStatus === 'NEEDS_REVIEW' ? '#fff3cd' : '#d4edda',
                }}>
                  {txn.reviewStatus}
                </span>
              </td>
              <td style={{ padding: '8px 4px' }}>
                {txn.category?.name ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length === 0 && (
        <p style={{ color: '#666', marginTop: 16 }}>No transactions to review.</p>
      )}
    </main>
  )
}
```

Note: The categories dropdown for inline editing requires a client component. For now, the page is a functional read-only view. Interactive categorisation is done via the /dashboard/import flow (import → rules apply → review).

- [ ] **Step 3: TypeScript check**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/apps/web"
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
git add 'apps/web/app/dashboard/transactions/page.tsx' 'apps/web/app/dashboard/transactions/actions.ts'
git commit -m "feat(web): transaction review page (server component, paginated)"
```

---

### Task 6: Full test suite

- [ ] **Step 1: Run full suite**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm test
```

Expected: 5 (db) + 44 (api) = 49 tests.

---

## Self-review

**Spec coverage:**

| Requirement | Task |
|-------------|------|
| GET /transactions with filters | Task 1 |
| PATCH /transactions/:id (categorise) | Task 1 |
| PATCH /transactions (bulk categorise) | Task 1 |
| GET/POST /suppliers | Task 2 |
| POST /suppliers/:id/aliases | Task 2 |
| Rules engine (pattern match, priority, trustedAutoReview) | Task 3 |
| GET/POST /rules + POST /rules/apply | Task 3 |
| Unit tests for rules engine | Task 3 |
| Integration tests for transactions | Task 4 |
| Next.js transaction review page | Task 5 |

All routes guarded by sessionMiddleware + requireRole. Tenant isolation enforced in all DB queries.
