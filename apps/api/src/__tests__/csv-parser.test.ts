import { describe, it, expect } from 'vitest'
import { parseStandardBankCsv } from '../lib/csv-parser'

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
