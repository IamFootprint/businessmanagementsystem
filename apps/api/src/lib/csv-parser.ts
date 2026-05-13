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
  const cleaned = raw.replace(/,/g, '').trim()
  const float = parseFloat(cleaned)
  if (isNaN(float)) throw new Error(`Cannot parse amount: "${raw}"`)
  return Math.round(float * 100)
}

function parseDate(raw: string): Date {
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }
  // "DD Mon YYYY" format (e.g. "02 Apr 2025")
  const parts = raw.trim().split(' ')
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const month = months[parts[1]]
    const year = parseInt(parts[2], 10)
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(Date.UTC(year, month, day))
    }
  }
  // ISO 8601 date-only: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    const [y, m, d] = raw.trim().split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
  }
  throw new Error(`Cannot parse date: "${raw}"`)
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
  let csvLineNumber = 1

  for (const record of records) {
    csvLineNumber++
    const desc = (record['Description'] ?? '').trim().toUpperCase()
    const amountRaw = record['Amount'] ?? ''
    const balanceRaw = record['Balance'] ?? ''

    if (desc.includes('OPENING BALANCE')) {
      const obBal = parseCents(balanceRaw)
      openingBalanceCents = obBal !== 0 ? obBal : parseCents(amountRaw)
      continue
    }

    if (desc.includes('CLOSING BALANCE')) {
      const cbBal = parseCents(balanceRaw)
      closingBalanceCents = cbBal !== 0 ? cbBal : parseCents(amountRaw)
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

  if (openingBalanceCents === null && rows.length > 0) {
    openingBalanceCents = rows[0].balanceAfterCents - rows[0].amountCents
  }

  if (closingBalanceCents === null && rows.length > 0) {
    closingBalanceCents = rows[rows.length - 1].balanceAfterCents
  }

  return { rows, openingBalanceCents, closingBalanceCents }
}
