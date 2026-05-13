// apps/api/src/lib/receipt-match.ts
export type TransactionCandidate = {
  id: string
  amountCents: number
  date: Date
  cleanDescription: string
}

export type ReceiptHint = {
  hintAmountCents: number | null
  hintDate: Date | null
  hintSupplier: string | null
}

export type MatchResult = {
  transactionId: string
  score: number
  matchStatus: 'MATCHED' | 'SUGGESTED' | 'UNMATCHED'
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export function scoreReceipt(hint: ReceiptHint, tx: TransactionCandidate): MatchResult {
  let score = 0

  if (hint.hintAmountCents !== null && hint.hintAmountCents === tx.amountCents) {
    score++
  }
  if (hint.hintDate !== null && Math.abs(hint.hintDate.getTime() - tx.date.getTime()) <= THREE_DAYS_MS) {
    score++
  }
  if (hint.hintSupplier !== null && tx.cleanDescription.toUpperCase().includes(hint.hintSupplier.toUpperCase())) {
    score++
  }

  const matchStatus: MatchResult['matchStatus'] =
    score === 3 ? 'MATCHED' : score === 2 ? 'SUGGESTED' : 'UNMATCHED'

  return { transactionId: tx.id, score, matchStatus }
}

export function rankCandidates(hint: ReceiptHint, candidates: TransactionCandidate[]): MatchResult[] {
  return candidates
    .map((tx) => scoreReceipt(hint, tx))
    .filter((r) => r.score >= 2)
    .sort((a, b) => b.score - a.score)
}
