import Link from 'next/link'
import { Zap } from 'lucide-react'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

type Transaction = {
  id: string
  transactionDate: string
  rawDescription: string
  amountCents: number
  reviewStatus: string
  direction: string
  category: { id: string; name: string } | null
  bankAccount: { nickname: string; bankName: string }
  business: { id: string; name: string } | null
}

type TransactionsResponse = {
  data: Transaction[]
  meta: { total: number; page: number; pageSize: number; pages: number }
}

const STATUS_TABS = ['NEEDS_REVIEW', 'REVIEWED', 'UNCLEAR', 'LOCKED'] as const

function statusBadgeVariant(status: string): 'warning' | 'success' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'NEEDS_REVIEW': return 'warning'
    case 'REVIEWED': return 'success'
    case 'UNCLEAR': return 'destructive'
    case 'LOCKED': return 'outline'
    default: return 'secondary'
  }
}

function formatAmount(cents: number): string {
  return `R ${(Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

async function getTransactions(reviewStatus: string, page: string) {
  try {
    return await apiRequestAuthenticated<TransactionsResponse>(
      `/transactions?reviewStatus=${reviewStatus}&pageSize=50&page=${page}`
    )
  } catch {
    return { data: [] as Transaction[], meta: { total: 0, page: 1, pageSize: 50, pages: 0 } }
  }
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const reviewStatus = (STATUS_TABS as readonly string[]).includes(params.reviewStatus)
    ? params.reviewStatus
    : 'NEEDS_REVIEW'
  const page = /^\d+$/.test(params.page ?? '') ? params.page! : '1'
  const { data: transactions, meta } = await getTransactions(reviewStatus, page)

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Transaction Review</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {meta.total} transaction{meta.total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/transactions/apply-rules">
            <Zap className="h-4 w-4" />
            Apply Rules
          </Link>
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={`/dashboard/transactions?reviewStatus=${s}`}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              reviewStatus === s
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            )}
          >
            {s.replace(/_/g, ' ')}
          </Link>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Date</TableHead>
                <TableHead scope="col">Account</TableHead>
                <TableHead scope="col">Description</TableHead>
                <TableHead scope="col" className="text-right">Amount</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center" style={{ color: 'var(--color-muted-foreground)' }}>
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="whitespace-nowrap text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      {new Date(txn.transactionDate).toLocaleDateString('en-ZA')}
                    </TableCell>
                    <TableCell className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      {txn.bankAccount.nickname}
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <span className="block truncate text-sm">{txn.rawDescription}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <span style={{ color: txn.direction === 'DEBIT' ? 'var(--color-destructive)' : 'var(--color-success)' }}>
                        {txn.direction === 'DEBIT' ? '−' : '+'}
                        {formatAmount(txn.amountCents)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(txn.reviewStatus)}>
                        {txn.reviewStatus.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {txn.category ? (
                        <span style={{ color: 'var(--color-foreground)' }}>{txn.category.name}</span>
                      ) : (
                        <span style={{ color: 'var(--color-muted-foreground)' }}>—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex items-center justify-between text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          <span>Page {meta.page} of {meta.pages}</span>
          <div className="flex gap-2">
            {meta.page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/transactions?reviewStatus=${reviewStatus}&page=${meta.page - 1}`}>
                  ← Previous
                </Link>
              </Button>
            )}
            {meta.page < meta.pages && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/transactions?reviewStatus=${reviewStatus}&page=${meta.page + 1}`}>
                  Next →
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
