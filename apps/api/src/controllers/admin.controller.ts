import type { Context } from 'hono'
import type { AppEnv } from '../types'
import type { TransactionType } from '@prisma/client'
import { prisma, seedRules } from '@bms/db'
import { createHash } from 'crypto'
import { parseStandardBankCsv } from '../lib/csv-parser'
import { makeTransactionHash, cleanDescription } from '../lib/import-hash'
import { extractMerchantName } from '../lib/supplier-extract'
import { findBestSupplierMatch, type SupplierCandidate } from '../lib/supplier-match'
import { braveSearch, pickWebsite, type BraveLookup } from '../lib/brave-search'

export const PETTY_CASH_NICKNAME = 'Petty Cash'
export const MANUAL_ENTRIES_FILENAME = '__manual_cash_entries__'

/**
 * POST /admin/seed-rules — seeds transaction rules from supplier research.
 *
 * Idempotent: re-running upserts existing records. Restricted to TENANT_OWNER
 * via role middleware. Runs inside the Worker context so DATABASE_URL never
 * needs to be exposed outside Cloudflare.
 */
export async function seedRulesAdmin(c: Context<AppEnv>) {
  try {
    const result = await seedRules(prisma)
    return c.json({
      ok: true,
      ...result,
    })
  } catch (err) {
    return c.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Seed failed',
      },
      500,
    )
  }
}

/**
 * POST /admin/backfill-business-ids — fills businessId=null on reviewed transactions
 * by re-matching cleanDescription against all rules that have a businessId.
 *
 * Only updates businessId (does not touch category, supplier, reviewStatus).
 * Safe to run multiple times — skips transactions that already have a businessId.
 * Restricted to TENANT_OWNER.
 */
export async function backfillBusinessIds(c: Context<AppEnv>) {
  const user = c.get('user')

  const bankAccountIds = (
    await prisma.bankAccount.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })
  ).map((b) => b.id)

  const rules = await prisma.transactionRule.findMany({
    where: { tenantId: user.tenantId, active: true, businessId: { not: null } },
    select: { descriptionPattern: true, businessId: true, priority: true },
    orderBy: { priority: 'desc' },
  })

  if (rules.length === 0) {
    return c.json({ ok: true, updated: 0, message: 'No rules with businessId found' })
  }

  const transactions = await prisma.transaction.findMany({
    where: { bankAccountId: { in: bankAccountIds }, businessId: null },
    select: { id: true, cleanDescription: true },
  })

  const updates: { id: string; businessId: string }[] = []
  for (const tx of transactions) {
    const desc = (tx.cleanDescription ?? '').toUpperCase()
    for (const rule of rules) {
      if (desc.includes(rule.descriptionPattern.toUpperCase())) {
        updates.push({ id: tx.id, businessId: rule.businessId! })
        break
      }
    }
  }

  if (updates.length === 0) {
    return c.json({ ok: true, updated: 0, scanned: transactions.length })
  }

  let updated = 0
  const BATCH = 50
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH)
    await Promise.allSettled(
      batch.map((u) => prisma.transaction.update({ where: { id: u.id }, data: { businessId: u.businessId } }))
    )
    updated += batch.length
  }

  return c.json({ ok: true, updated, scanned: transactions.length })
}

/**
 * POST /admin/reapply-rules — re-applies all active rules to historical transactions.
 *
 * Updates category, supplier, business, isPersonal, transactionType, ruleId
 * on transactions that were previously rule-attributed (ruleId != null) OR
 * have not yet been manually reviewed (reviewStatus = NEEDS_REVIEW).
 * Skips REVIEWED / UNCLEAR / LOCKED transactions to preserve manual decisions.
 *
 * Restricted to TENANT_OWNER. Idempotent — safe to re-run.
 */
export async function reapplyRules(c: Context<AppEnv>) {
  const user = c.get('user')

  // Pagination so we stay within Worker CPU budget. Default 250 txns/call.
  const limit = Math.max(1, Math.min(1000, Number(c.req.query('limit') ?? 250)))
  const cursor = c.req.query('cursor') ?? undefined

  const bankAccountIds = (
    await prisma.bankAccount.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })
  ).map((b) => b.id)

  const rules = await prisma.transactionRule.findMany({
    where: { tenantId: user.tenantId, active: true },
    select: {
      id: true,
      descriptionPattern: true,
      categoryId: true,
      supplierId: true,
      businessId: true,
      transactionType: true,
      isPersonal: true,
      priority: true,
    },
    orderBy: { priority: 'desc' },
  })

  if (rules.length === 0) {
    return c.json({ ok: true, updated: 0, message: 'No active rules' })
  }

  // Include everything except LOCKED + manually REVIEWED (reviewedById set).
  // System auto-reviewed transactions have reviewedById = null and should be
  // re-evaluated when the rule taxonomy changes.
  const transactions = await prisma.transaction.findMany({
    where: {
      bankAccountId: { in: bankAccountIds },
      reviewStatus: { not: 'LOCKED' },
      reviewedById: null,
      ...(cursor ? { id: { gt: cursor } } : {}),
    },
    select: { id: true, cleanDescription: true },
    orderBy: { id: 'asc' },
    take: limit,
  })

  const updates: Array<{
    id: string
    categoryId: string | null
    supplierId: string | null
    businessId: string | null
    transactionType: TransactionType
    isPersonal: boolean
    ruleId: string
  }> = []

  for (const tx of transactions) {
    const desc = (tx.cleanDescription ?? '').toUpperCase()
    for (const rule of rules) {
      if (desc.includes(rule.descriptionPattern.toUpperCase())) {
        updates.push({
          id: tx.id,
          categoryId: rule.categoryId,
          supplierId: rule.supplierId,
          businessId: rule.businessId,
          transactionType: (rule.transactionType ?? 'UNKNOWN') as TransactionType,
          isPersonal: rule.isPersonal ?? false,
          ruleId: rule.id,
        })
        break
      }
    }
  }

  if (updates.length === 0) {
    return c.json({ ok: true, updated: 0, scanned: transactions.length })
  }

  let updated = 0
  const BATCH = 40
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH)
    await Promise.allSettled(
      batch.map((u) =>
        prisma.transaction.update({
          where: { id: u.id },
          data: {
            categoryId: u.categoryId,
            supplierId: u.supplierId,
            businessId: u.businessId,
            transactionType: u.transactionType,
            isPersonal: u.isPersonal,
            ruleId: u.ruleId,
          },
        })
      )
    )
    updated += batch.length
  }

  const nextCursor = transactions.length > 0 ? transactions[transactions.length - 1].id : null
  const done = transactions.length < limit
  return c.json({
    ok: true,
    updated,
    scanned: transactions.length,
    rulesEvaluated: rules.length,
    nextCursor: done ? null : nextCursor,
    done,
  })
}

/**
 * POST /admin/seed-petty-cash — provisions the manual-entry plumbing.
 *
 * Idempotently creates:
 *   1. A 'Petty Cash' BankAccount for the tenant (currency ZAR, type 'CASH').
 *   2. A long-lived StatementImport ('__manual_cash_entries__') anchored to
 *      that bank account, used as the importId on every manual Transaction
 *      so we don't need to make the FK nullable.
 *
 * Returns the IDs so the client can cache them. Restricted to TENANT_OWNER.
 */
export async function seedPettyCashAdmin(c: Context<AppEnv>) {
  const user = c.get('user')

  const existingPetty = await prisma.bankAccount.findFirst({
    where: { tenantId: user.tenantId, nickname: PETTY_CASH_NICKNAME },
    select: { id: true },
  })

  const pettyCash =
    existingPetty ??
    (await prisma.bankAccount.create({
      data: {
        tenantId: user.tenantId,
        nickname: PETTY_CASH_NICKNAME,
        bankName: 'Petty Cash',
        accountType: 'CASH',
        currency: 'ZAR',
        active: true,
      },
      select: { id: true },
    }))

  const existingImport = await prisma.statementImport.findFirst({
    where: { bankAccountId: pettyCash.id, fileName: MANUAL_ENTRIES_FILENAME },
    select: { id: true },
  })

  const manualImport =
    existingImport ??
    (await prisma.statementImport.create({
      data: {
        bankAccountId: pettyCash.id,
        importedById: user.id,
        fileName: MANUAL_ENTRIES_FILENAME,
        fileHash: 'manual-entries',
        rowCount: 0,
        status: 'COMPLETE',
      },
      select: { id: true },
    }))

  return c.json({
    ok: true,
    pettyCashAccountId: pettyCash.id,
    manualImportId: manualImport.id,
    createdAccount: !existingPetty,
    createdImport: !existingImport,
  })
}

/**
 * POST /admin/process-unknown-suppliers — link transactions to suppliers.
 *
 * For every transaction with no supplierId (paginated by `?limit=N&cursor=ID`):
 *   1. Extract a merchant name from the raw description (heuristic NER).
 *   2. Fuzzy-match against existing suppliers + aliases.
 *   3. On match → link the transaction to the existing supplier (CONFIRMED).
 *   4. On miss → call Brave Search (if BRAVE_SEARCH_API_KEY is configured),
 *      create a new supplier with reviewStatus=NEEDS_REVIEW and
 *      lookupSource=IMPORT_AUTO, save the search results, and link the txn.
 *      If the search call fails, still create the supplier (lookupRawJson=null)
 *      so a human reviewer can take it from there.
 *
 * Idempotent — re-running only touches transactions still missing a supplier.
 * Suppliers created in earlier passes get re-used by name within the same call
 * via a local cache.
 *
 * Restricted to TENANT_OWNER.
 */
export async function processUnknownSuppliers(c: Context<AppEnv>) {
  const user = c.get('user')
  const limit = Math.max(1, Math.min(500, Number(c.req.query('limit') ?? 50)))
  const cursor = c.req.query('cursor') ?? undefined
  const skipSearch = c.req.query('skipSearch') === 'true'

  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  const canSearch = !skipSearch && Boolean(apiKey)

  // Load existing suppliers + aliases for fuzzy matching
  const dbSuppliers = await prisma.supplier.findMany({
    where: { tenantId: user.tenantId },
    select: {
      id: true,
      name: true,
      aliases: { select: { pattern: true } },
    },
  })
  const candidates: SupplierCandidate[] = dbSuppliers.map((s) => ({
    id: s.id,
    name: s.name,
    aliases: s.aliases.map((a) => a.pattern),
  }))

  // Find transactions still missing a supplier
  const bankAccountIds = (
    await prisma.bankAccount.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })
  ).map((b) => b.id)

  const transactions = await prisma.transaction.findMany({
    where: {
      bankAccountId: { in: bankAccountIds },
      supplierId: null,
      reviewStatus: { not: 'LOCKED' },
      ...(cursor ? { id: { gt: cursor } } : {}),
    },
    select: { id: true, rawDescription: true, cleanDescription: true },
    orderBy: { id: 'asc' },
    take: limit,
  })

  let matched = 0
  let created = 0
  let skipped = 0
  let searchFailures = 0

  // In-call cache so multiple txns with the same merchant share one supplier
  // (e.g. five MAKRO STREUBE charges in one statement → one supplier created).
  const newSupplierByName = new Map<string, string>()

  for (const tx of transactions) {
    const { merchant } = extractMerchantName(tx.rawDescription)
    if (!merchant) {
      skipped++
      continue
    }

    // 1. Try matching against existing suppliers
    const match = findBestSupplierMatch(merchant, candidates)
    if (match) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { supplierId: match.supplier.id },
      })
      matched++
      continue
    }

    // 2. Try matching against suppliers we just created in this call
    const cachedId = newSupplierByName.get(merchant.toUpperCase())
    if (cachedId) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { supplierId: cachedId },
      })
      matched++
      continue
    }

    // 3. Create a new supplier (with optional Brave lookup)
    let lookup: BraveLookup | null = null
    let website: string | null = null
    if (canSearch) {
      try {
        lookup = await braveSearch(`${merchant} South Africa`, apiKey!, 3)
        website = pickWebsite(lookup)
      } catch {
        searchFailures++
        lookup = null
      }
    }

    // Race-safe upsert by (tenantId, name) — collisions can happen if the same
    // merchant appears in two parallel processings.
    const supplier = await prisma.supplier.upsert({
      where: { tenantId_name: { tenantId: user.tenantId, name: merchant } },
      update: {},
      create: {
        tenantId: user.tenantId,
        name: merchant,
        website,
        reviewStatus: 'NEEDS_REVIEW',
        lookupSource: lookup ? 'BRAVE' : 'IMPORT_AUTO',
        lookupRawJson: lookup ? (lookup as unknown as object) : undefined,
        extractedFromDescription: tx.rawDescription,
      },
      select: { id: true },
    })

    await prisma.transaction.update({
      where: { id: tx.id },
      data: { supplierId: supplier.id },
    })

    newSupplierByName.set(merchant.toUpperCase(), supplier.id)
    // Add to the in-memory candidate set so subsequent fuzzy matches in this
    // call can hit it (with alias-only matching).
    candidates.push({ id: supplier.id, name: merchant, aliases: [] })
    created++
  }

  const nextCursor = transactions.length > 0 ? transactions[transactions.length - 1].id : null
  const done = transactions.length < limit

  return c.json({
    ok: true,
    scanned: transactions.length,
    matched,
    created,
    skipped,
    searchFailures,
    searchEnabled: canSearch,
    nextCursor: done ? null : nextCursor,
    done,
  })
}

/**
 * POST /admin/clear-transaction-data — destructively clears all transactions,
 * statement imports, import rows, audit events and receipts for the current
 * tenant. Keeps tenants, businesses, bank accounts, users, categories,
 * suppliers, rules, periods — only the imported transaction data is removed.
 *
 * Requires query param ?confirm=YES to execute. Restricted to TENANT_OWNER.
 *
 * Intended for one-time cleanup of seed test data before importing real
 * statements. Cannot be undone.
 */
export async function clearTransactionDataAdmin(c: Context<AppEnv>) {
  const user = c.get('user')
  const confirm = c.req.query('confirm')
  if (confirm !== 'YES') {
    return c.json(
      {
        ok: false,
        error: 'Confirmation required',
        message: 'Append ?confirm=YES to the URL to actually delete data',
      },
      400,
    )
  }

  try {
    // Find bank accounts for this tenant (scope all deletes)
    const bankAccountIds = (
      await prisma.bankAccount.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true },
      })
    ).map((b) => b.id)

    // Find transactions in those accounts
    const txIds = (
      await prisma.transaction.findMany({
        where: { bankAccountId: { in: bankAccountIds } },
        select: { id: true },
      })
    ).map((t) => t.id)

    // Find imports
    const importIds = (
      await prisma.statementImport.findMany({
        where: { bankAccountId: { in: bankAccountIds } },
        select: { id: true },
      })
    ).map((i) => i.id)

    // Find receipts linked to these transactions OR uploaded by tenant users
    // (seed receipts have transactionId set, real receipts may be unlinked)
    const tenantUserPhones = (
      await prisma.user.findMany({
        where: { tenantId: user.tenantId, phone: { not: null } },
        select: { phone: true },
      })
    ).map((u) => u.phone as string)

    // Delete order respects FK constraints:
    // 1. TransactionAuditEvent (cascade from Transaction)
    // 2. Receipts linked to transactions in this tenant
    // 3. StatementImportRow (cascade from StatementImport)
    // 4. Transactions
    // 5. StatementImports
    const auditDeleted = await prisma.transactionAuditEvent.deleteMany({
      where: { transactionId: { in: txIds } },
    })

    // Detach receipts from these transactions before deleting them (FK from Receipt → Transaction is optional)
    const receiptsDetached = await prisma.receipt.updateMany({
      where: { transactionId: { in: txIds } },
      data: { transactionId: null },
    })

    // Now delete receipts that were linked to these transactions OR uploaded by tenant users
    const receiptsToDelete = await prisma.receipt.findMany({
      where: {
        OR: [
          { uploaderPhone: { in: tenantUserPhones } },
          // Seed receipts: ID prefix 'seed-receipt-'
          { id: { startsWith: 'seed-receipt-' } },
        ],
      },
      select: { id: true },
    })
    const receiptsDeleted = await prisma.receipt.deleteMany({
      where: { id: { in: receiptsToDelete.map((r) => r.id) } },
    })

    const importRowsDeleted = await prisma.statementImportRow.deleteMany({
      where: { importId: { in: importIds } },
    })

    const txDeleted = await prisma.transaction.deleteMany({
      where: { id: { in: txIds } },
    })

    const importsDeleted = await prisma.statementImport.deleteMany({
      where: { id: { in: importIds } },
    })

    return c.json({
      ok: true,
      tenantId: user.tenantId,
      deleted: {
        transactions: txDeleted.count,
        statementImports: importsDeleted.count,
        statementImportRows: importRowsDeleted.count,
        auditEvents: auditDeleted.count,
        receipts: receiptsDeleted.count,
        receiptsDetached: receiptsDetached.count,
      },
    })
  } catch (err) {
    return c.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Clear failed',
      },
      500,
    )
  }
}

/**
 * POST /admin/bulk-import-csv — fast bulk-import using createMany.
 *
 * Avoids per-row round-trips that hang Neon WebSocket connections on Cloudflare
 * Workers. Takes a multipart form (file, bankAccountId) just like /imports but
 * batches everything into 3 queries:
 *   1. findMany — look up duplicates in one round trip
 *   2. createMany — insert all new transactions in one round trip
 *   3. createMany — insert all import rows in one round trip
 *
 * StatementImportRow.transactionId is NOT populated by this endpoint (would
 * require an extra findMany). Acceptable trade-off for the speed.
 *
 * Restricted to TENANT_OWNER.
 */
export async function bulkImportCsvAdmin(c: Context<AppEnv>) {
  const user = c.get('user')

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Expected multipart/form-data' }, 400)
  }

  const file = formData.get('file')
  const bankAccountId = formData.get('bankAccountId')

  if (!file || typeof file === 'string') return c.json({ error: 'Missing file' }, 400)
  if (!bankAccountId || typeof bankAccountId !== 'string') return c.json({ error: 'Missing bankAccountId' }, 400)

  // Validate bank account ownership
  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
    select: { tenantId: true },
  })
  if (!bankAccount) return c.json({ error: `Bank account not found: ${bankAccountId}` }, 404)
  if (bankAccount.tenantId !== user.tenantId) return c.json({ error: 'Bank account belongs to different tenant' }, 403)

  let csvText: string
  try {
    csvText = await (file as File).text()
  } catch {
    return c.json({ error: 'Could not read file' }, 400)
  }

  let parsed: ReturnType<typeof parseStandardBankCsv>
  try {
    parsed = parseStandardBankCsv(csvText)
  } catch (err) {
    return c.json({ error: `CSV parse error: ${err instanceof Error ? err.message : 'unknown'}` }, 422)
  }

  if (parsed.rows.length === 0) {
    return c.json({ error: 'No transaction rows in CSV' }, 422)
  }

  // Compute file hash
  const fileHashStr = createHash('sha256').update(csvText).digest('hex')

  // Build all the work items upfront
  const items = parsed.rows.map((row) => {
    const hash = makeTransactionHash({
      bankAccountId,
      transactionDate: row.transactionDate,
      amountCents: row.amountCents,
      balanceAfterCents: row.balanceAfterCents,
      rawDescription: row.rawDescription,
    })
    return {
      row,
      duplicateHash: hash,
      direction: (row.amountCents >= 0 ? 'CREDIT' : 'DEBIT') as 'CREDIT' | 'DEBIT',
    }
  })

  const allHashes = items.map((i) => i.duplicateHash)

  // Step 1: Single findMany to detect duplicates
  const existing = await prisma.transaction.findMany({
    where: { duplicateHash: { in: allHashes } },
    select: { duplicateHash: true },
  })
  const existingSet = new Set(existing.map((e) => e.duplicateHash))

  // Step 2: Create StatementImport
  const statementImport = await prisma.statementImport.create({
    data: {
      bankAccountId,
      importedById: user.id,
      fileName: (file as File).name,
      fileHash: fileHashStr,
      rowCount: parsed.rows.length,
      status: 'PROCESSING',
      openingBalanceCents: parsed.openingBalanceCents,
      closingBalanceCents: parsed.closingBalanceCents,
    },
  })

  // Step 3: Partition into new vs duplicate
  const newItems = items.filter((i) => !existingSet.has(i.duplicateHash))
  const dupItems = items.filter((i) => existingSet.has(i.duplicateHash))

  // Step 4: Batch-create new transactions
  // createMany doesn't return IDs, but we don't need them since StatementImportRow.transactionId
  // is optional. Audit links can be resolved later via duplicateHash.
  let createdCount = 0
  if (newItems.length > 0) {
    const result = await prisma.transaction.createMany({
      data: newItems.map(({ row, duplicateHash, direction }) => ({
        bankAccountId,
        importId: statementImport.id,
        transactionDate: row.transactionDate,
        rawDescription: row.rawDescription,
        cleanDescription: cleanDescription(row.rawDescription),
        amountCents: row.amountCents,
        balanceAfterCents: row.balanceAfterCents,
        duplicateHash,
        csvRowNumber: row.csvRowNumber,
        direction,
      })),
      skipDuplicates: true,
    })
    createdCount = result.count
  }

  // Step 5: Batch-create import rows (no transactionId — keeps it cheap)
  if (items.length > 0) {
    await prisma.statementImportRow.createMany({
      data: items.map(({ row, duplicateHash }) => ({
        importId: statementImport.id,
        rowNumber: row.csvRowNumber,
        rawJson: row as object,
        duplicateHash,
        action: existingSet.has(duplicateHash) ? 'DUPLICATE_SKIPPED' as const : 'IMPORTED' as const,
      })),
    })
  }

  // Step 6: Finalise import status
  await prisma.statementImport.update({
    where: { id: statementImport.id },
    data: {
      importedCount: createdCount,
      duplicateCount: dupItems.length,
      errorCount: newItems.length - createdCount, // any that createMany skipped
      status: 'COMPLETE',
    },
  })

  return c.json({
    ok: true,
    importId: statementImport.id,
    fileName: (file as File).name,
    rowCount: parsed.rows.length,
    importedCount: createdCount,
    duplicateCount: dupItems.length,
    errorCount: newItems.length - createdCount,
    openingBalanceCents: parsed.openingBalanceCents,
    closingBalanceCents: parsed.closingBalanceCents,
  })
}
