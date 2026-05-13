import type { ReviewStatus, TransactionType } from '@bms/db'

type Transaction = {
  id: string
  cleanDescription: string
  reviewStatus: ReviewStatus
  categoryId: string | null
  supplierId: string | null
  businessId: string | null
  transactionType: TransactionType
  isPersonal: boolean
}

type Rule = {
  id: string
  descriptionPattern: string
  categoryId: string | null
  supplierId: string | null
  businessId: string | null
  transactionType: string | null
  isPersonal: boolean | null
  trustedAutoReview: boolean
  priority: number
  active: boolean
}

export type RuleMatch = {
  transactionId: string
  ruleId: string
  categoryId: string | null
  supplierId: string | null
  businessId: string | null
  transactionType: TransactionType | null
  isPersonal: boolean | null
  reviewStatus: ReviewStatus
}

export function applyRulesToTransactions(
  transactions: Transaction[],
  rules: Rule[]
): RuleMatch[] {
  const sortedRules = [...rules]
    .filter(r => r.active)
    .sort((a, b) => b.priority - a.priority)

  const matches: RuleMatch[] = []

  for (const txn of transactions) {
    if (txn.reviewStatus !== 'NEEDS_REVIEW') continue

    const matchedRule = sortedRules.find(rule =>
      txn.cleanDescription.toUpperCase().includes(rule.descriptionPattern.toUpperCase())
    )

    if (!matchedRule) continue

    matches.push({
      transactionId: txn.id,
      ruleId: matchedRule.id,
      categoryId: matchedRule.categoryId,
      supplierId: matchedRule.supplierId,
      businessId: matchedRule.businessId,
      transactionType: matchedRule.transactionType as TransactionType | null,
      isPersonal: matchedRule.isPersonal,
      reviewStatus: matchedRule.trustedAutoReview ? 'REVIEWED' : 'NEEDS_REVIEW',
    })
  }

  return matches
}
