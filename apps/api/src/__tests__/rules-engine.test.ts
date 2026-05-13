import { describe, it, expect } from 'vitest'
import { applyRulesToTransactions } from '../lib/rules-engine'

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

const makeRule = (id: string, pattern: string, overrides: Record<string, unknown> = {}) => ({
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
    const matches = applyRulesToTransactions(
      [makeTransaction('t1', 'CHECKERS SUPERMARKET')],
      [makeRule('r1', 'CHECKERS', { categoryId: 'cat-groceries' })]
    )
    expect(matches).toHaveLength(1)
    expect(matches[0].transactionId).toBe('t1')
    expect(matches[0].categoryId).toBe('cat-groceries')
  })

  it('uses highest-priority rule when multiple match', () => {
    const matches = applyRulesToTransactions(
      [makeTransaction('t1', 'CHECKERS SUPERMARKET')],
      [
        makeRule('r1', 'CHECKERS', { categoryId: 'cat-low', priority: 0 }),
        makeRule('r2', 'CHECKERS SUPERMARKET', { categoryId: 'cat-high', priority: 10 }),
      ]
    )
    expect(matches[0].categoryId).toBe('cat-high')
  })

  it('sets reviewStatus REVIEWED when trustedAutoReview is true', () => {
    const matches = applyRulesToTransactions(
      [makeTransaction('t1', 'MONTHLY SALARY')],
      [makeRule('r1', 'SALARY', { categoryId: 'cat-salary', trustedAutoReview: true })]
    )
    expect(matches[0].reviewStatus).toBe('REVIEWED')
  })

  it('keeps reviewStatus NEEDS_REVIEW when trustedAutoReview is false', () => {
    const matches = applyRulesToTransactions(
      [makeTransaction('t1', 'MONTHLY SALARY')],
      [makeRule('r1', 'SALARY', { categoryId: 'cat-salary' })]
    )
    expect(matches[0].reviewStatus).toBe('NEEDS_REVIEW')
  })

  it('returns empty array when no rules match', () => {
    const matches = applyRulesToTransactions(
      [makeTransaction('t1', 'RANDOM MERCHANT')],
      [makeRule('r1', 'CHECKERS')]
    )
    expect(matches).toHaveLength(0)
  })

  it('skips transactions with reviewStatus other than NEEDS_REVIEW', () => {
    const matches = applyRulesToTransactions(
      [{ ...makeTransaction('t1', 'CHECKERS'), reviewStatus: 'REVIEWED' as const }],
      [makeRule('r1', 'CHECKERS', { categoryId: 'cat-grocery' })]
    )
    expect(matches).toHaveLength(0)
  })

  it('does case-insensitive matching', () => {
    const matches = applyRulesToTransactions(
      [makeTransaction('t1', 'CHECKERS SUPERMARKET')],
      [makeRule('r1', 'checkers', { categoryId: 'cat-grocery' })]
    )
    expect(matches).toHaveLength(1)
  })
})
