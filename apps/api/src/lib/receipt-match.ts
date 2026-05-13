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

const MS_PER_DAY = 86_400_000

/** Bank posting lag: receipts often appear 1–3 days after the transaction date. */
const DATE_TOLERANCE_DAYS = 3

function dayDiff(a: Date, b: Date): number {
  return Math.round(Math.abs(a.getTime() - b.getTime()) / MS_PER_DAY)
}

export function scoreReceipt(hint: ReceiptHint, tx: TransactionCandidate): MatchResult {
  let score = 0

  if (hint.hintAmountCents !== null && hint.hintAmountCents === tx.amountCents) {
    score++
  }
  if (hint.hintDate !== null && dayDiff(hint.hintDate, tx.date) <= DATE_TOLERANCE_DAYS) {
    score++
  }
  if (hint.hintSupplier !== null && tx.cleanDescription.toUpperCase().includes(hint.hintSupplier.toUpperCase())) {
    score++
  }

  const matchStatus: MatchResult['matchStatus'] =
    score === 3 ? 'MATCHED' : score === 2 ? 'SUGGESTED' : 'UNMATCHED'

  return { transactionId: tx.id, score, matchStatus }
}

export function rankCandidates(
  hint: ReceiptHint,
  candidates: TransactionCandidate[],
  minScore = 2,
): MatchResult[] {
  return candidates
    .map((tx) => scoreReceipt(hint, tx))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score || a.transactionId.localeCompare(b.transactionId))
}
