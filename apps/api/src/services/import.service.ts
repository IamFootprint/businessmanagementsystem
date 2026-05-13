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
  bankAccountId: string
): Promise<{ action: ImportRowAction; errorMessage?: string }> {
  const duplicateHash = makeTransactionHash({
    bankAccountId,
    transactionDate: row.transactionDate,
    amountCents: row.amountCents,
    balanceAfterCents: row.balanceAfterCents,
    rawDescription: row.rawDescription,
  })

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
    const result = await processRow(row, statementImport.id, bankAccountId)
    if (result.action === 'IMPORTED') importedCount++
    else if (result.action === 'DUPLICATE_SKIPPED') duplicateCount++
    else if (result.action === 'ERROR') errorCount++
  }

  const finalStatus: ImportStatus =
    errorCount === rows.length && rows.length > 0 ? 'FAILED' : 'COMPLETE'

  await prisma.statementImport.update({
    where: { id: statementImport.id },
    data: { importedCount, duplicateCount, errorCount, status: finalStatus },
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
