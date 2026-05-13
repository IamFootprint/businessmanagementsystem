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
