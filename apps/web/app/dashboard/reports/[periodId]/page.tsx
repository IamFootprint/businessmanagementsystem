import Link from 'next/link'
import { ArrowLeft, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

type CategoryItem = { categoryId: string; name: string; amountCents: number }

type SnapshotData = {
  businessId: string
  year: number
  month: number
  generatedAt: string
  totalRevenueCents: number
  totalExpenseCents: number
  netProfitCents: number
  revenueByCategory: CategoryItem[]
  expenseByCategory: CategoryItem[]
  uncategorisedRevenueCents: number
  uncategorisedExpenseCents: number
  transactionCount: number
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

// API returns all amounts as positive cents; sign is applied at the call site
function fmt(cents: number) {
  return `R ${(Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ periodId: string }>
}) {
  const { periodId } = await params

  if (!/^[\w-]+$/.test(periodId)) {
    return (
      <div className="p-8">
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Invalid period ID.</p>
      </div>
    )
  }

  let snapshot: SnapshotData | null = null
  try {
    const response = await apiRequestAuthenticated<{ snapshot: SnapshotData }>(`/periods/${periodId}/report`)
    snapshot = response.snapshot
  } catch {
    // fall through to null check below
  }

  if (!snapshot) {
    return (
      <div className="p-8">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link href="/dashboard/reports"><ArrowLeft className="h-4 w-4" />Back to Reports</Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Report not available. Lock the period first to generate a snapshot.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const title = `${MONTH_NAMES[snapshot.month - 1]} ${snapshot.year}`
  const netPositive = snapshot.netProfitCents >= 0

  return (
    <div className="p-8">
      {/* Back + download */}
      <div className="mb-6 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/reports">
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/periods/${periodId}/export`} download>
            <Download className="h-4 w-4" />
            Download CSV
          </a>
        </Button>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>{title} — P&amp;L Report</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Generated {new Date(snapshot.generatedAt).toLocaleString('en-ZA')} · {snapshot.transactionCount} transactions
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--color-success)' }} />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{fmt(snapshot.totalRevenueCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
              <TrendingDown className="h-4 w-4" style={{ color: 'var(--color-destructive)' }} />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-destructive)' }}>{fmt(snapshot.totalExpenseCents)}</p>
          </CardContent>
        </Card>
        <Card
          style={{
            borderColor: netPositive ? 'color-mix(in srgb, var(--color-success) 30%, transparent)' : 'color-mix(in srgb, var(--color-destructive) 30%, transparent)',
            backgroundColor: netPositive ? '#f0fdf4' : '#fef2f2',
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
              <Minus className="h-4 w-4" />
              Net Profit / Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" style={{ color: netPositive ? 'var(--color-success)' : 'var(--color-destructive)' }}>
              {netPositive ? '' : '−'}{fmt(snapshot.netProfitCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator className="mb-8" />

      {/* Expense breakdown */}
      {snapshot.expenseByCategory.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>Expenses by Category</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Category</TableHead>
                    <TableHead scope="col" className="text-right">Amount</TableHead>
                    <TableHead scope="col" className="text-right">% of expenses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.expenseByCategory.map((e) => (
                    <TableRow key={e.categoryId}>
                      <TableCell>{e.name}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(e.amountCents)}</TableCell>
                      <TableCell className="text-right" style={{ color: 'var(--color-muted-foreground)' }}>
                        {snapshot.totalExpenseCents > 0
                          ? `${((e.amountCents / snapshot.totalExpenseCents) * 100).toFixed(1)}%`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {snapshot.uncategorisedExpenseCents > 0 && (
                    <TableRow>
                      <TableCell className="italic" style={{ color: 'var(--color-muted-foreground)' }}>Uncategorised</TableCell>
                      <TableCell className="text-right font-mono" style={{ color: 'var(--color-muted-foreground)' }}>
                        {fmt(snapshot.uncategorisedExpenseCents)}
                      </TableCell>
                      <TableCell className="text-right" style={{ color: 'var(--color-muted-foreground)' }}>
                        {snapshot.totalExpenseCents > 0
                          ? `${((snapshot.uncategorisedExpenseCents / snapshot.totalExpenseCents) * 100).toFixed(1)}%`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue breakdown */}
      {snapshot.revenueByCategory.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>Revenue by Category</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Category</TableHead>
                    <TableHead scope="col" className="text-right">Amount</TableHead>
                    <TableHead scope="col" className="text-right">% of revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.revenueByCategory.map((r) => (
                    <TableRow key={r.categoryId}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.amountCents)}</TableCell>
                      <TableCell className="text-right" style={{ color: 'var(--color-muted-foreground)' }}>
                        {snapshot.totalRevenueCents > 0
                          ? `${((r.amountCents / snapshot.totalRevenueCents) * 100).toFixed(1)}%`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {snapshot.uncategorisedRevenueCents > 0 && (
                    <TableRow>
                      <TableCell className="italic" style={{ color: 'var(--color-muted-foreground)' }}>Uncategorised</TableCell>
                      <TableCell className="text-right font-mono" style={{ color: 'var(--color-muted-foreground)' }}>
                        {fmt(snapshot.uncategorisedRevenueCents)}
                      </TableCell>
                      <TableCell className="text-right" style={{ color: 'var(--color-muted-foreground)' }}>
                        {snapshot.totalRevenueCents > 0
                          ? `${((snapshot.uncategorisedRevenueCents / snapshot.totalRevenueCents) * 100).toFixed(1)}%`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
