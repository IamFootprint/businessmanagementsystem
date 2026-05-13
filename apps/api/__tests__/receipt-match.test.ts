// apps/api/__tests__/receipt-match.test.ts
import { describe, it, expect } from 'vitest'
import { scoreReceipt, rankCandidates, type ReceiptHint, type TransactionCandidate } from '../src/lib/receipt-match'

const base: TransactionCandidate = {
  id: 'tx1',
  amountCents: 5000,
  date: new Date('2024-01-15'),
  cleanDescription: 'PICK N PAY STORES PTY LTD',
}

const hint: ReceiptHint = {
  hintAmountCents: 5000,
  hintDate: new Date('2024-01-15'),
  hintSupplier: 'pick n pay',
}

describe('scoreReceipt', () => {
  it('returns score 3 and MATCHED when all signals match', () => {
    const result = scoreReceipt(hint, base)
    expect(result.score).toBe(3)
    expect(result.matchStatus).toBe('MATCHED')
  })

  it('returns score 2 and SUGGESTED when amount and date match but supplier does not', () => {
    const result = scoreReceipt({ ...hint, hintSupplier: 'woolworths' }, base)
    expect(result.score).toBe(2)
    expect(result.matchStatus).toBe('SUGGESTED')
  })

  it('returns score 1 and UNMATCHED when only amount matches', () => {
    const result = scoreReceipt(
      { ...hint, hintDate: new Date('2024-02-20'), hintSupplier: 'woolworths' },
      base
    )
    expect(result.score).toBe(1)
    expect(result.matchStatus).toBe('UNMATCHED')
  })

  it('accepts date within 3-day window', () => {
    const result = scoreReceipt({ ...hint, hintDate: new Date('2024-01-18') }, base)
    expect(result.score).toBe(3)
  })

  it('rejects date outside 3-day window', () => {
    const result = scoreReceipt({ ...hint, hintDate: new Date('2024-01-19') }, base)
    expect(result.score).toBe(2) // amount + supplier, not date
  })

  it('handles null hints gracefully — scores 0 for null signal', () => {
    const result = scoreReceipt(
      { hintAmountCents: null, hintDate: null, hintSupplier: null },
      base
    )
    expect(result.score).toBe(0)
    expect(result.matchStatus).toBe('UNMATCHED')
  })
})

describe('rankCandidates', () => {
  const candidates: TransactionCandidate[] = [
    { id: 'tx-score1', amountCents: 9999, date: new Date('2024-01-15'), cleanDescription: 'RANDOM STORE ABC' },
    { id: 'tx-score2', amountCents: 5000, date: new Date('2024-01-15'), cleanDescription: 'WOOLWORTHS STORE' },
    { id: 'tx-score3', amountCents: 5000, date: new Date('2024-01-15'), cleanDescription: 'PICK N PAY STORES PTY LTD' },
  ]
  const hint: ReceiptHint = {
    hintAmountCents: 5000,
    hintDate: new Date('2024-01-15'),
    hintSupplier: 'pick n pay',
  }

  it('filters out candidates with score < 2', () => {
    const results = rankCandidates(hint, candidates)
    const ids = results.map((r) => r.transactionId)
    expect(ids).not.toContain('tx-score1')
  })

  it('sorts results descending by score', () => {
    const results = rankCandidates(hint, candidates)
    expect(results[0].transactionId).toBe('tx-score3') // score 3
    expect(results[1].transactionId).toBe('tx-score2') // score 2 (amount + date, not supplier)
  })

  it('returns empty array when no candidates reach score 2', () => {
    const noMatchHint: ReceiptHint = { hintAmountCents: 99999, hintDate: new Date('2020-01-01'), hintSupplier: 'xyz' }
    const results = rankCandidates(noMatchHint, candidates)
    expect(results).toHaveLength(0)
  })
})
