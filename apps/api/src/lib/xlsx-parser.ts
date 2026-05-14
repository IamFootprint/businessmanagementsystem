// apps/api/src/lib/xlsx-parser.ts
import * as XLSX from 'xlsx'
import type { ParseResult, ParsedRow } from './csv-parser'

function parseCents(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0
  const str = String(raw).replace(/,/g, '').trim()
  const n = parseFloat(str)
  if (isNaN(n)) throw new Error(`Cannot parse amount: "${raw}"`)
  return Math.round(n * 100)
}

function parseDate(raw: unknown): Date {
  if (raw instanceof Date) {
    return new Date(Date.UTC(raw.getFullYear(), raw.getMonth(), raw.getDate()))
  }
  const str = String(raw ?? '').trim()
  const slashMatch = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
  if (slashMatch) {
    return new Date(Date.UTC(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1])))
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
  }
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }
  const parts = str.split(' ')
  if (parts.length === 3 && months[parts[1]] !== undefined) {
    return new Date(Date.UTC(Number(parts[2]), months[parts[1]], Number(parts[0])))
  }
  throw new Error(`Cannot parse date from xlsx: "${str}"`)
}

function findHeaderRow(sheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:Z100')
  for (let r = range.s.r; r <= Math.min(range.e.r, 10); r++) {
    const cells = ['A', 'B', 'C', 'D'].map(col => {
      const cell = sheet[`${col}${r + 1}`]
      return String(cell?.v ?? '').toLowerCase()
    })
    if (cells.some(v => v.includes('date')) && cells.some(v => v.includes('amount'))) {
      return r
    }
  }
  throw new Error('Could not find header row with Date and Amount columns in xlsx')
}

export function parseStandardBankXlsx(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('No sheets found in xlsx file')
  const sheet = workbook.Sheets[sheetName]

  const headerRowIdx = findHeaderRow(sheet)

  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    range: headerRowIdx,
    raw: false,
    dateNF: 'yyyy-mm-dd',
  }) as unknown[][]

  if (raw.length < 2) throw new Error('No data rows found in xlsx')

  const headers = (raw[0] as unknown[]).map(h => String(h ?? '').toLowerCase().trim())
  const dateIdx = headers.findIndex(h => h.includes('date'))
  const descIdx = headers.findIndex(h => h.includes('description') || h.includes('desc'))
  const amountIdx = headers.findIndex(h => h.includes('amount'))
  const balanceIdx = headers.findIndex(h => h.includes('balance'))

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    throw new Error('Required columns (date, description, amount) not found in xlsx')
  }

  const rows: ParsedRow[] = []
  let openingBalanceCents: number | null = null
  let closingBalanceCents: number | null = null

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[]
    const rawDate = row[dateIdx]
    const rawDesc = String(row[descIdx] ?? '').trim()
    const rawAmount = row[amountIdx]
    const rawBalance = balanceIdx >= 0 ? row[balanceIdx] : undefined

    if (!rawDate || !rawDesc || rawAmount === undefined || rawAmount === '') continue

    const descLower = rawDesc.toLowerCase()
    if (descLower.includes('opening balance')) {
      openingBalanceCents = parseCents(rawBalance ?? rawAmount)
      continue
    }
    if (descLower.includes('closing balance')) {
      closingBalanceCents = parseCents(rawBalance ?? rawAmount)
      continue
    }

    let transactionDate: Date
    try {
      transactionDate = parseDate(rawDate)
    } catch {
      continue
    }

    let amountCents: number
    try {
      amountCents = parseCents(rawAmount)
    } catch {
      continue
    }

    rows.push({
      csvRowNumber: i + headerRowIdx + 1,
      transactionDate,
      rawDescription: rawDesc,
      amountCents,
      balanceAfterCents: rawBalance !== undefined ? parseCents(rawBalance) : 0,
    })
  }

  return { rows, openingBalanceCents, closingBalanceCents }
}
