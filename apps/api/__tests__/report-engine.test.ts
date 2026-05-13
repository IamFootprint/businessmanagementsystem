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

  it('tracks uncategorised revenue separately', () => {
    const noCategory = { ...baseTx, id: 't5', transactionType: 'REVENUE' as const, direction: 'CREDIT' as const, category: null }
    const report = buildReport(BUSINESS_ID, YEAR, MONTH, [noCategory])
    expect(report.uncategorisedRevenueCents).toBe(5000)
    expect(report.revenueByCategory).toHaveLength(0)
  })
})

describe('reportToCsv', () => {
  it('returns a string with a header row', () => {
    const report = buildReport(BUSINESS_ID, YEAR, MONTH, [baseTx])
    const csv = reportToCsv(report, [baseTx])
    expect(typeof csv).toBe('string')
    expect(csv.split('\n')[0]).toBe('Date,Description,Amount (ZAR),Category,Direction,Status')
  })

  it('includes one data row per transaction', () => {
    const report = buildReport(BUSINESS_ID, YEAR, MONTH, [baseTx])
    const csv = reportToCsv(report, [baseTx])
    const rows = csv.trim().split('\n')
    expect(rows).toHaveLength(2) // header + 1 data row
  })
})
