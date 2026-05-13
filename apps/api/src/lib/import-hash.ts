import { createHash } from 'crypto'

type HashInput = {
  bankAccountId: string
  transactionDate: Date
  amountCents: number
  balanceAfterCents: number
  rawDescription: string
}

export function cleanDescription(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, ' ')
}

export function makeTransactionHash(input: HashInput): string {
  const key = [
    input.bankAccountId,
    input.transactionDate.toISOString().slice(0, 10), // YYYY-MM-DD
    input.amountCents.toString(),
    input.balanceAfterCents.toString(),
    cleanDescription(input.rawDescription),
  ].join('|')

  return createHash('sha256').update(key).digest('hex')
}
