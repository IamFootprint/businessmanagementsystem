# BMS Plan 3 — Import Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse Standard Bank CSV statements, detect duplicates via deterministic hash, persist `StatementImport` + `StatementImportRow` + `Transaction` records, and expose a POST /imports API endpoint guarded by session + role middleware.

**Architecture:** The CSV parser is a pure function that normalises Standard Bank's format into typed rows. A service layer handles the import transaction: hashing each row, skipping duplicates, writing to the three tables atomically per-row. The API controller streams summary progress. No file storage — CSV text is sent in the request body (multipart form upload processed in memory; files are typically <500 KB).

**Tech Stack:** Hono 4, Prisma 6, Node.js `stream` (none — parse synchronously, files are small), `csv-parse` for CSV parsing, `crypto` for deterministic hash, Vitest for unit + integration tests.

---

## File map

| File | Action | Purpose |
|------|--------|---------|
| `apps/api/src/lib/csv-parser.ts` | Create | Standard Bank CSV → typed `ParsedRow[]` |
| `apps/api/src/lib/import-hash.ts` | Create | `makeTransactionHash(row)` — deterministic duplicate key |
| `apps/api/src/services/import.service.ts` | Create | Orchestrate import: validate, iterate rows, upsert transactions |
| `apps/api/src/controllers/import.controller.ts` | Create | Hono handler: receive multipart CSV, call service, return summary |
| `apps/api/src/routes/import.routes.ts` | Create | POST /imports (auth + FINANCE_MANAGER or TENANT_OWNER) |
| `apps/api/src/routes/index.ts` | Modify | Register import routes |
| `apps/api/src/__tests__/csv-parser.test.ts` | Create | Unit tests for CSV parsing edge cases |
| `apps/api/src/__tests__/import-hash.test.ts` | Create | Unit tests for hash determinism and collision resistance |
| `apps/api/src/__tests__/import.test.ts` | Create | Integration test: POST /imports end-to-end |

---

### Task 1: csv-parse dependency + CSV parser

**Files:**
- Modify: `apps/api/package.json` (add csv-parse)
- Create: `apps/api/src/lib/csv-parser.ts`
- Create: `apps/api/src/__tests__/csv-parser.test.ts`

**Standard Bank CSV format** (actual headers from their business account export):

```
Date,Description,Amount,Balance
01 Apr 2025,"CAPITEC BANK,12345678, REF:AB12CD","-1,234.56","45,678.90"
```

Key facts:
- Date format: `DD Mon YYYY` (e.g. `01 Apr 2025`)
- Amounts use comma thousands separator and may have parentheses for negatives (rare) or minus prefix
- Opening balance row: `Description` contains "OPENING BALANCE" — skip and record separately
- Amounts are always displayed as positive with a +/- in context of the statement; the actual sign must be derived from the amount prefix (minus = debit)
- Header row: `Date,Description,Amount,Balance`

- [ ] **Step 1: Install csv-parse**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm --filter @bms/api add csv-parse
```

- [ ] **Step 2: Write failing tests first**

Create `apps/api/src/__tests__/csv-parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseStandardBankCsv, type ParsedRow } from '../lib/csv-parser'

const SAMPLE_CSV = `Date,Description,Amount,Balance
01 Apr 2025,OPENING BALANCE,,45000.00
02 Apr 2025,"CAPITEC BANK,12345678, REF:AB12CD",-1234.56,43765.44
03 Apr 2025,SALARY PAYMENT,50000.00,93765.44
04 Apr 2025,ATM WITHDRAWAL,-500.00,93265.44
`

describe('parseStandardBankCsv', () => {
  it('skips opening balance row', () => {
    const result = parseStandardBankCsv(SAMPLE_CSV)
    expect(result.rows.every(r => !r.rawDescription.includes('OPENING BALANCE'))).toBe(true)
  })

  it('captures opening balance amount', () => {
    const result = parseStandardBankCsv(SAMPLE_CSV)
    expect(result.openingBalanceCents).toBe(4500000)
  })

  it('parses debit amount as negative cents', () => {
    const result = parseStandardBankCsv(SAMPLE_CSV)
    const capitec = result.rows.find(r => r.rawDescription.includes('CAPITEC'))!
    expect(capitec.amountCents).toBe(-123456)
  })

  it('parses credit amount as positive cents', () => {
    const result = parseStandardBankCsv(SAMPLE_CSV)
    const salary = result.rows.find(r => r.rawDescription.includes('SALARY'))!
    expect(salary.amountCents).toBe(5000000)
  })

  it('parses balance as positive cents', () => {
    const result = parseStandardBankCsv(SAMPLE_CSV)
    const salary = result.rows.find(r => r.rawDescription.includes('SALARY'))!
    expect(salary.balanceAfterCents).toBe(9376544)
  })

  it('parses transaction date correctly', () => {
    const result = parseStandardBankCsv(SAMPLE_CSV)
    const atm = result.rows.find(r => r.rawDescription.includes('ATM'))!
    expect(atm.transactionDate.toISOString().startsWith('2025-04-04')).toBe(true)
  })

  it('returns correct row count excluding opening balance', () => {
    const result = parseStandardBankCsv(SAMPLE_CSV)
    expect(result.rows.length).toBe(3)
  })

  it('preserves csv row number (1-based, includes header)', () => {
    const result = parseStandardBankCsv(SAMPLE_CSV)
    // Row 1 = header, Row 2 = opening balance (skipped), Row 3 = capitec
    const capitec = result.rows.find(r => r.rawDescription.includes('CAPITEC'))!
    expect(capitec.csvRowNumber).toBe(3)
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm --filter @bms/api test --reporter=verbose 2>&1 | tail -20
```

Expected: csv-parser tests FAIL (module not found).

- [ ] **Step 4: Create `apps/api/src/lib/csv-parser.ts`**

```typescript
import { parse } from 'csv-parse/sync'

export type ParsedRow = {
  csvRowNumber: number
  transactionDate: Date
  rawDescription: string
  amountCents: number
  balanceAfterCents: number
}

export type ParseResult = {
  rows: ParsedRow[]
  openingBalanceCents: number | null
  closingBalanceCents: number | null
}

function parseCents(raw: string): number {
  if (!raw || raw.trim() === '') return 0
  // Remove thousands separators, trim whitespace
  const cleaned = raw.replace(/,/g, '').trim()
  const float = parseFloat(cleaned)
  if (isNaN(float)) return 0
  return Math.round(float * 100)
}

function parseDate(raw: string): Date {
  // Standard Bank format: "DD Mon YYYY" e.g. "01 Apr 2025"
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }
  const parts = raw.trim().split(' ')
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const month = months[parts[1]]
    const year = parseInt(parts[2], 10)
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(Date.UTC(year, month, day))
    }
  }
  // Fallback: attempt ISO parse
  const d = new Date(raw)
  if (!isNaN(d.getTime())) return d
  throw new Error(`Cannot parse date: ${raw}`)
}

export function parseStandardBankCsv(csvText: string): ParseResult {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>

  const rows: ParsedRow[] = []
  let openingBalanceCents: number | null = null
  let closingBalanceCents: number | null = null

  // csv-parse with columns:true gives us rows as objects.
  // csvRowNumber: header is row 1, first data row is row 2.
  let csvLineNumber = 1 // tracks the header line

  for (const record of records) {
    csvLineNumber++
    const desc = (record['Description'] ?? '').trim().toUpperCase()
    const amountRaw = record['Amount'] ?? ''
    const balanceRaw = record['Balance'] ?? ''

    if (desc.includes('OPENING BALANCE')) {
      openingBalanceCents = parseCents(balanceRaw) || parseCents(amountRaw)
      continue
    }

    if (desc.includes('CLOSING BALANCE')) {
      closingBalanceCents = parseCents(balanceRaw) || parseCents(amountRaw)
      continue
    }

    const amountCents = parseCents(amountRaw)
    const balanceAfterCents = parseCents(balanceRaw)
    const transactionDate = parseDate(record['Date'] ?? '')

    rows.push({
      csvRowNumber: csvLineNumber,
      transactionDate,
      rawDescription: (record['Description'] ?? '').trim(),
      amountCents,
      balanceAfterCents,
    })
  }

  // If no opening balance row found, use first balance - first amount
  if (openingBalanceCents === null && rows.length > 0) {
    openingBalanceCents = rows[0].balanceAfterCents - rows[0].amountCents
  }

  if (closingBalanceCents === null && rows.length > 0) {
    closingBalanceCents = rows[rows.length - 1].balanceAfterCents
  }

  return { rows, openingBalanceCents, closingBalanceCents }
}
```

- [ ] **Step 5: Run tests — they should now pass**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm --filter @bms/api test --reporter=verbose 2>&1 | tail -30
```

Expected: all csv-parser tests pass (8 tests). Health + auth tests still pass.

- [ ] **Step 6: Commit**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
git add apps/api/package.json pnpm-lock.yaml apps/api/src/lib/csv-parser.ts apps/api/src/__tests__/csv-parser.test.ts
git commit -m "feat(import): Standard Bank CSV parser with opening balance detection"
```

---

### Task 2: Duplicate hash function

**Files:**
- Create: `apps/api/src/lib/import-hash.ts`
- Create: `apps/api/src/__tests__/import-hash.test.ts`

The duplicate hash is deterministic: same transaction always produces the same hash. Fields used: `bankAccountId`, `transactionDate` (ISO date string, UTC), `amountCents` (integer), `balanceAfterCents` (integer), `cleanedDescription` (uppercase, collapsed whitespace).

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/__tests__/import-hash.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { makeTransactionHash, cleanDescription } from '../lib/import-hash'

const BASE = {
  bankAccountId: 'acc-123',
  transactionDate: new Date('2025-04-02T00:00:00.000Z'),
  amountCents: -123456,
  balanceAfterCents: 4376544,
  rawDescription: 'CAPITEC BANK,12345678, REF:AB12CD',
}

describe('makeTransactionHash', () => {
  it('is deterministic — same inputs produce same hash', () => {
    const h1 = makeTransactionHash(BASE)
    const h2 = makeTransactionHash({ ...BASE })
    expect(h1).toBe(h2)
  })

  it('changes when bankAccountId changes', () => {
    const h1 = makeTransactionHash(BASE)
    const h2 = makeTransactionHash({ ...BASE, bankAccountId: 'acc-456' })
    expect(h1).not.toBe(h2)
  })

  it('changes when amountCents changes', () => {
    const h1 = makeTransactionHash(BASE)
    const h2 = makeTransactionHash({ ...BASE, amountCents: -100 })
    expect(h1).not.toBe(h2)
  })

  it('changes when transactionDate changes', () => {
    const h1 = makeTransactionHash(BASE)
    const h2 = makeTransactionHash({ ...BASE, transactionDate: new Date('2025-04-03T00:00:00.000Z') })
    expect(h1).not.toBe(h2)
  })

  it('changes when balanceAfterCents changes', () => {
    const h1 = makeTransactionHash(BASE)
    const h2 = makeTransactionHash({ ...BASE, balanceAfterCents: 9999999 })
    expect(h1).not.toBe(h2)
  })

  it('is insensitive to description whitespace and case', () => {
    const h1 = makeTransactionHash(BASE)
    const h2 = makeTransactionHash({ ...BASE, rawDescription: '  capitec  bank,12345678,   ref:ab12cd  ' })
    expect(h1).toBe(h2)
  })

  it('returns a 64-char hex string', () => {
    const h = makeTransactionHash(BASE)
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('cleanDescription', () => {
  it('uppercases and collapses whitespace', () => {
    expect(cleanDescription('  hello   world  ')).toBe('HELLO WORLD')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm --filter @bms/api test --reporter=verbose 2>&1 | grep -E "(FAIL|import-hash)"
```

- [ ] **Step 3: Create `apps/api/src/lib/import-hash.ts`**

```typescript
import { createHash } from 'crypto'

type HashInput = {
  bankAccountId: string
  transactionDate: Date
  amountCents: number
  balanceAfterCents: number
  rawDescription: string
}

export function cleanDescription(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, ' ')
}

export function makeTransactionHash(input: HashInput): string {
  const key = [
    input.bankAccountId,
    input.transactionDate.toISOString().slice(0, 10), // YYYY-MM-DD
    input.amountCents.toString(),
    input.balanceAfterCents.toString(),
    cleanDescription(input.rawDescription),
  ].join('|')

  return createHash('sha256').update(key).digest('hex')
}
```

- [ ] **Step 4: Run tests**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm --filter @bms/api test --reporter=verbose 2>&1 | tail -20
```

Expected: import-hash tests pass (7+2 = 9 tests in that file).

- [ ] **Step 5: Commit**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
git add apps/api/src/lib/import-hash.ts apps/api/src/__tests__/import-hash.test.ts
git commit -m "feat(import): deterministic duplicate hash for transaction deduplication"
```

---

### Task 3: Import service

**Files:**
- Create: `apps/api/src/services/import.service.ts`

The service takes a parsed CSV result + metadata and writes records to the DB. It creates one `StatementImport`, then iterates each row: check duplicate, create `Transaction` + `StatementImportRow`. Returns a summary.

- [ ] **Step 1: Create `apps/api/src/services/import.service.ts`**

```typescript
import { prisma } from '@bms/db'
import type { ImportStatus, ImportRowAction, TransactionDirection } from '@bms/db'
import { makeTransactionHash, cleanDescription } from '../lib/import-hash'
import type { ParseResult, ParsedRow } from '../lib/csv-parser'
import { createHash } from 'crypto'

export type ImportInput = {
  bankAccountId: string
  importedById: string
  fileName: string
  csvText: string
  parsedResult: ParseResult
}

export type ImportSummary = {
  importId: string
  fileName: string
  rowCount: number
  importedCount: number
  duplicateCount: number
  errorCount: number
  openingBalanceCents: number | null
  closingBalanceCents: number | null
}

function fileHash(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

function determineDirection(amountCents: number): TransactionDirection {
  return amountCents >= 0 ? 'CREDIT' : 'DEBIT'
}

async function processRow(
  row: ParsedRow,
  importId: string,
  bankAccountId: string,
  bankAccount: { tenantId: string }
): Promise<{ action: ImportRowAction; errorMessage?: string }> {
  const duplicateHash = makeTransactionHash({
    bankAccountId,
    transactionDate: row.transactionDate,
    amountCents: row.amountCents,
    balanceAfterCents: row.balanceAfterCents,
    rawDescription: row.rawDescription,
  })

  // Check for duplicate
  const existing = await prisma.transaction.findUnique({ where: { duplicateHash } })
  if (existing) {
    await prisma.statementImportRow.create({
      data: {
        importId,
        rowNumber: row.csvRowNumber,
        rawJson: row as object,
        duplicateHash,
        action: 'DUPLICATE_SKIPPED',
        transactionId: existing.id,
      },
    })
    return { action: 'DUPLICATE_SKIPPED' }
  }

  // Create transaction
  try {
    const transaction = await prisma.transaction.create({
      data: {
        bankAccountId,
        importId,
        transactionDate: row.transactionDate,
        rawDescription: row.rawDescription,
        cleanDescription: cleanDescription(row.rawDescription),
        amountCents: row.amountCents,
        balanceAfterCents: row.balanceAfterCents,
        duplicateHash,
        csvRowNumber: row.csvRowNumber,
        direction: determineDirection(row.amountCents),
      },
    })

    await prisma.statementImportRow.create({
      data: {
        importId,
        rowNumber: row.csvRowNumber,
        rawJson: row as object,
        duplicateHash,
        action: 'IMPORTED',
        transactionId: transaction.id,
      },
    })

    return { action: 'IMPORTED' }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    await prisma.statementImportRow.create({
      data: {
        importId,
        rowNumber: row.csvRowNumber,
        rawJson: row as object,
        duplicateHash,
        action: 'ERROR',
        errorMessage,
      },
    })
    return { action: 'ERROR', errorMessage }
  }
}

export async function runImport(input: ImportInput): Promise<ImportSummary> {
  const { bankAccountId, importedById, fileName, csvText, parsedResult } = input

  // Verify bank account exists and get tenantId
  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
    select: { tenantId: true },
  })
  if (!bankAccount) throw new Error(`Bank account not found: ${bankAccountId}`)

  const { rows, openingBalanceCents, closingBalanceCents } = parsedResult

  const statementImport = await prisma.statementImport.create({
    data: {
      bankAccountId,
      importedById,
      fileName,
      fileHash: fileHash(csvText),
      rowCount: rows.length,
      status: 'PROCESSING',
      openingBalanceCents,
      closingBalanceCents,
    },
  })

  let importedCount = 0
  let duplicateCount = 0
  let errorCount = 0

  for (const row of rows) {
    const result = await processRow(row, statementImport.id, bankAccountId, bankAccount)
    if (result.action === 'IMPORTED') importedCount++
    else if (result.action === 'DUPLICATE_SKIPPED') duplicateCount++
    else if (result.action === 'ERROR') errorCount++
  }

  const finalStatus: ImportStatus = errorCount === rows.length && rows.length > 0 ? 'FAILED' : 'COMPLETE'

  await prisma.statementImport.update({
    where: { id: statementImport.id },
    data: {
      importedCount,
      duplicateCount,
      errorCount,
      status: finalStatus,
    },
  })

  return {
    importId: statementImport.id,
    fileName,
    rowCount: rows.length,
    importedCount,
    duplicateCount,
    errorCount,
    openingBalanceCents,
    closingBalanceCents,
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/apps/api"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
git add apps/api/src/services/import.service.ts
git commit -m "feat(import): import service with duplicate detection and row-level error tracking"
```

---

### Task 4: Import controller + routes

**Files:**
- Create: `apps/api/src/controllers/import.controller.ts`
- Create: `apps/api/src/routes/import.routes.ts`
- Modify: `apps/api/src/routes/index.ts`

The controller receives a multipart form upload: `file` (CSV) + `bankAccountId`. It parses the CSV in memory, calls `runImport`, returns the summary.

- [ ] **Step 1: Create `apps/api/src/controllers/import.controller.ts`**

```typescript
import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { parseStandardBankCsv } from '../lib/csv-parser'
import { runImport } from '../services/import.service'

export async function createImport(c: Context<AppEnv>) {
  const user = c.get('user')

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Expected multipart/form-data with a CSV file' }, 400)
  }

  const file = formData.get('file')
  const bankAccountId = formData.get('bankAccountId')

  if (!file || typeof file === 'string') {
    return c.json({ error: 'Missing file field' }, 400)
  }
  if (!bankAccountId || typeof bankAccountId !== 'string') {
    return c.json({ error: 'Missing bankAccountId field' }, 400)
  }

  let csvText: string
  try {
    csvText = await (file as File).text()
  } catch {
    return c.json({ error: 'Could not read uploaded file' }, 400)
  }

  let parsedResult: Awaited<ReturnType<typeof parseStandardBankCsv>>
  try {
    parsedResult = parseStandardBankCsv(csvText)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'CSV parse error'
    return c.json({ error: `Invalid CSV: ${msg}` }, 422)
  }

  if (parsedResult.rows.length === 0) {
    return c.json({ error: 'CSV contains no transaction rows' }, 422)
  }

  try {
    const summary = await runImport({
      bankAccountId,
      importedById: user.id,
      fileName: (file as File).name,
      csvText,
      parsedResult,
    })
    return c.json(summary, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Import failed'
    return c.json({ error: msg }, 500)
  }
}
```

- [ ] **Step 2: Create `apps/api/src/routes/import.routes.ts`**

```typescript
import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import { requireRole } from '../middleware/role.middleware'
import { createImport } from '../controllers/import.controller'

export function registerImportRoutes(app: Hono<AppEnv>) {
  app.post(
    '/imports',
    sessionMiddleware,
    requireRole('TENANT_OWNER', 'FINANCE_MANAGER'),
    createImport
  )
}
```

- [ ] **Step 3: Update `apps/api/src/routes/index.ts`**

```typescript
import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { getHealth, getDbHealth } from '../controllers/health.controller'
import { registerAuthRoutes } from './auth.routes'
import { registerImportRoutes } from './import.routes'

export function registerRoutes(app: Hono<AppEnv>) {
  app.get('/health', getHealth)
  app.get('/health/db', getDbHealth)
  registerAuthRoutes(app)
  registerImportRoutes(app)
}
```

- [ ] **Step 4: TypeScript check + run existing tests**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/apps/api"
npx tsc --noEmit
```

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm --filter @bms/api test
```

Expected: 18 tests pass (2 health + 8 auth + 8 csv-parser).

- [ ] **Step 5: Commit**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
git add apps/api/src/controllers/import.controller.ts apps/api/src/routes/import.routes.ts apps/api/src/routes/index.ts
git commit -m "feat(import): import controller and routes (POST /imports, role-guarded)"
```

---

### Task 5: Import integration test

**Files:**
- Create: `apps/api/src/__tests__/import.test.ts`

Tests the full POST /imports endpoint through the Hono app against the `bms_test` database. Creates fixtures (tenant, bank account, user), sends a real CSV, verifies the response and DB state.

- [ ] **Step 1: Create `apps/api/src/__tests__/import.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma, UserRole } from '@bms/db'
import { hashPassword } from '../lib/password'
import { createApp } from '../app'

const app = createApp()

const TEST_EMAIL = `importer-${Date.now()}@kgolaentle.com`
const TEST_PASSWORD = 'ImportPass123!'

const SAMPLE_CSV = `Date,Description,Amount,Balance
01 Apr 2025,OPENING BALANCE,,45000.00
02 Apr 2025,"CAPITEC BANK,12345678, REF:AB12CD",-1234.56,43765.44
03 Apr 2025,SALARY PAYMENT,50000.00,93765.44
04 Apr 2025,ATM WITHDRAWAL,-500.00,93265.44
`

let tenantId: string
let userId: string
let bankAccountId: string
let sessionToken: string

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { name: 'Import Test Tenant', slug: `import-test-${Date.now()}` },
  })
  tenantId = tenant.id

  const bankAccount = await prisma.bankAccount.create({
    data: {
      tenantId,
      nickname: 'Test Standard Bank',
      bankName: 'Standard Bank',
      accountType: 'Business Cheque',
    },
  })
  bankAccountId = bankAccount.id

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

  // Login to get a session token
  const loginRes = await app.request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  const loginBody = await loginRes.json()
  sessionToken = loginBody.token
})

afterAll(async () => {
  if (tenantId) {
    await prisma.statementImportRow.deleteMany({
      where: { import: { bankAccount: { tenantId } } },
    })
    await prisma.transaction.deleteMany({
      where: { bankAccountId },
    })
    await prisma.statementImport.deleteMany({
      where: { bankAccountId },
    })
    await prisma.session.deleteMany({ where: { userId } })
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.bankAccount.deleteMany({ where: { id: bankAccountId } })
    await prisma.tenant.deleteMany({ where: { id: tenantId } })
  }
  await prisma.$disconnect()
})

function makeFormData(csv: string, baid: string): FormData {
  const fd = new FormData()
  fd.append('file', new Blob([csv], { type: 'text/csv' }), 'statement.csv')
  fd.append('bankAccountId', baid)
  return fd
}

describe('POST /imports', () => {
  it('returns 401 with no auth', async () => {
    const res = await app.request('/imports', {
      method: 'POST',
      body: makeFormData(SAMPLE_CSV, bankAccountId),
    })
    expect(res.status).toBe(401)
  })

  it('returns 201 with import summary on valid CSV', async () => {
    const fd = makeFormData(SAMPLE_CSV, bankAccountId)
    const res = await app.request('/imports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: fd,
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.rowCount).toBe(3)
    expect(body.importedCount).toBe(3)
    expect(body.duplicateCount).toBe(0)
    expect(body.errorCount).toBe(0)
    expect(typeof body.importId).toBe('string')
  })

  it('returns duplicate count on re-import of same file', async () => {
    const fd = makeFormData(SAMPLE_CSV, bankAccountId)
    const res = await app.request('/imports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: fd,
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.importedCount).toBe(0)
    expect(body.duplicateCount).toBe(3)
  })

  it('returns 422 for empty CSV', async () => {
    const fd = new FormData()
    fd.append('file', new Blob(['Date,Description,Amount,Balance\n'], { type: 'text/csv' }), 'empty.csv')
    fd.append('bankAccountId', bankAccountId)
    const res = await app.request('/imports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: fd,
    })
    expect(res.status).toBe(422)
  })

  it('returns 400 when bankAccountId is missing', async () => {
    const fd = new FormData()
    fd.append('file', new Blob([SAMPLE_CSV], { type: 'text/csv' }), 'statement.csv')
    const res = await app.request('/imports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: fd,
    })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run all tests**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm --filter @bms/api test
```

Expected: all tests pass. New count = 18 existing + 5 import integration = 23 tests.

- [ ] **Step 3: Commit**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
git add apps/api/src/__tests__/import.test.ts
git commit -m "test(import): integration tests for POST /imports endpoint"
```

---

### Task 6: Import page in Next.js web

**Files:**
- Create: `apps/web/app/dashboard/import/page.tsx`
- Create: `apps/web/app/dashboard/import/actions.ts`
- Create: `apps/web/lib/api-client.server.ts`

The import page lets authenticated users upload a CSV file. A server action reads the session cookie, calls the API, displays the summary.

- [ ] **Step 1: Create `apps/web/lib/api-client.server.ts`**

This helper wraps `apiRequest` with automatic session cookie forwarding for server-side calls:

```typescript
import { cookies } from 'next/headers'
import { apiRequest } from './api-client'

type ApiOptions = Parameters<typeof apiRequest>[1]

export async function apiRequestAuthenticated<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const cookieStore = await cookies()
  const token = cookieStore.get('bms-session')?.value
  return apiRequest<T>(path, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  })
}
```

- [ ] **Step 2: Create `apps/web/app/dashboard/import/actions.ts`**

```typescript
'use server'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

export type ImportState = {
  summary?: {
    importId: string
    fileName: string
    rowCount: number
    importedCount: number
    duplicateCount: number
    errorCount: number
    openingBalanceCents: number | null
    closingBalanceCents: number | null
  }
  error?: string
} | null

export async function importCsvAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const file = formData.get('file')
  const bankAccountId = formData.get('bankAccountId')

  if (!file || typeof file === 'string') {
    return { error: 'Please select a CSV file' }
  }
  if (!bankAccountId || typeof bankAccountId !== 'string') {
    return { error: 'Bank account ID is required' }
  }

  const apiForm = new FormData()
  apiForm.append('file', file)
  apiForm.append('bankAccountId', bankAccountId)

  try {
    const summary = await apiRequestAuthenticated<ImportState['summary']>('/imports', {
      method: 'POST',
      body: apiForm as unknown as Record<string, unknown>,
    })
    return { summary }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Import failed'
    return { error: msg }
  }
}
```

Wait — `apiRequest` in `api-client.ts` sets `Content-Type: application/json` and JSON-stringifies the body, which is wrong for FormData. We need to send raw FormData without the JSON header. The `apiRequest` function needs to be able to handle FormData bodies.

Update `apps/web/lib/api-client.ts` to detect FormData and skip the JSON headers:

The current `api-client.ts`:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown }

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((error as { message?: string }).message ?? res.statusText)
  }

  return res.json() as Promise<T>
}
```

Update it to handle FormData:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown }

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options
  const isFormData = body instanceof FormData

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: isFormData
      ? { ...headers as Record<string, string> }
      : { 'Content-Type': 'application/json', ...headers as Record<string, string> },
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((error as { message?: string }).message ?? res.statusText)
  }

  return res.json() as Promise<T>
}
```

Update `apps/web/lib/api-client.server.ts` accordingly — the body passed to `apiRequestAuthenticated` for imports is a `FormData` object directly:

```typescript
import { cookies } from 'next/headers'
import { apiRequest } from './api-client'

type ApiOptions = Parameters<typeof apiRequest>[1]

export async function apiRequestAuthenticated<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const cookieStore = await cookies()
  const token = cookieStore.get('bms-session')?.value
  return apiRequest<T>(path, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string> ?? {}),
    },
  })
}
```

Update `apps/web/app/dashboard/import/actions.ts` — pass FormData directly:

```typescript
'use server'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

export type ImportState = {
  summary?: {
    importId: string
    fileName: string
    rowCount: number
    importedCount: number
    duplicateCount: number
    errorCount: number
    openingBalanceCents: number | null
    closingBalanceCents: number | null
  }
  error?: string
} | null

export async function importCsvAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const file = formData.get('file')
  const bankAccountId = formData.get('bankAccountId')

  if (!file || typeof file === 'string') {
    return { error: 'Please select a CSV file' }
  }
  if (!bankAccountId || typeof bankAccountId !== 'string') {
    return { error: 'Bank account ID is required' }
  }

  const apiForm = new FormData()
  apiForm.append('file', file)
  apiForm.append('bankAccountId', bankAccountId)

  try {
    const summary = await apiRequestAuthenticated<NonNullable<ImportState>['summary']>('/imports', {
      method: 'POST',
      body: apiForm,
    })
    return { summary }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Import failed'
    return { error: msg }
  }
}
```

- [ ] **Step 3: Create `apps/web/app/dashboard/import/page.tsx`**

```typescript
'use client'
import { useActionState } from 'react'
import { importCsvAction } from './actions'
import type { ImportState } from './actions'

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return `R ${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export default function ImportPage() {
  const [state, formAction, isPending] = useActionState<ImportState, FormData>(
    importCsvAction,
    null
  )

  return (
    <main style={{ padding: 32, maxWidth: 600 }}>
      <h1>Import Bank Statement</h1>
      <form action={formAction}>
        {state?.error && (
          <p style={{ color: 'red', marginBottom: 12 }}>{state.error}</p>
        )}
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="bankAccountId" style={{ display: 'block', marginBottom: 4 }}>
            Bank Account ID
          </label>
          <input
            id="bankAccountId"
            name="bankAccountId"
            type="text"
            required
            placeholder="seed-stdbank-main"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="file" style={{ display: 'block', marginBottom: 4 }}>
            CSV File
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          style={{ padding: '10px 24px', cursor: isPending ? 'not-allowed' : 'pointer' }}
        >
          {isPending ? 'Importing...' : 'Import'}
        </button>
      </form>

      {state?.summary && (
        <div style={{ marginTop: 24, padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
          <h2>Import Complete</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td>File</td><td><strong>{state.summary.fileName}</strong></td></tr>
              <tr><td>Total rows</td><td>{state.summary.rowCount}</td></tr>
              <tr><td>Imported</td><td style={{ color: 'green' }}>{state.summary.importedCount}</td></tr>
              <tr><td>Duplicates skipped</td><td>{state.summary.duplicateCount}</td></tr>
              <tr><td>Errors</td><td style={{ color: state.summary.errorCount > 0 ? 'red' : 'inherit' }}>{state.summary.errorCount}</td></tr>
              <tr><td>Opening balance</td><td>{formatCents(state.summary.openingBalanceCents)}</td></tr>
              <tr><td>Closing balance</td><td>{formatCents(state.summary.closingBalanceCents)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/apps/web"
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
git add apps/web/lib/api-client.ts apps/web/lib/api-client.server.ts 'apps/web/app/dashboard/import/page.tsx' 'apps/web/app/dashboard/import/actions.ts'
git commit -m "feat(web): import CSV page with server action and FormData forwarding"
```

---

### Task 7: Full test suite

- [ ] **Step 1: Run full suite**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm test
```

Expected: all tests pass. Minimum count: 5 (db) + 23 (api) = 28 tests.

- [ ] **Step 2: Commit if any fixes needed; otherwise verify and continue**

---

## Self-review

**Spec coverage:**

| Requirement | Task |
|-------------|------|
| Install csv-parse | Task 1 |
| Standard Bank CSV parser (date, amounts, balance, skip opening balance) | Task 1 |
| Deterministic duplicate hash (bankAccountId + date + amount + balance + cleanDescription) | Task 2 |
| Import service (StatementImport + rows + transactions, deduplication) | Task 3 |
| POST /imports endpoint (auth + role guard) | Task 4 |
| Import summary response (rowCount, importedCount, duplicateCount, errorCount) | Task 4 |
| Unit tests for parser and hash | Tasks 1, 2 |
| Integration test for import endpoint | Task 5 |
| Next.js import page | Task 6 |

No placeholders. All code shown. All commands exact.
