import Link from 'next/link'
import { Receipt, ExternalLink } from 'lucide-react'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { Badge } from '@/components/ui/badge'
import type { BadgeProps } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

type ReceiptItem = {
  id: string
  uploaderPhone: string
  capturedAt: string
  matchStatus: string
  isStale: boolean
  hintAmountCents: number | null
  hintDate: string | null
  hintSupplier: string | null
  storagePath: string
  fileName: string
}

const STATUS_TABS = ['', 'UNMATCHED', 'SUGGESTED', 'MATCHED', 'STALE'] as const

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function matchStatusVariant(status: string): BadgeProps['variant'] {
  switch (status) {
    case 'MATCHED': return 'success'
    case 'SUGGESTED': return 'warning'
    case 'UNMATCHED': return 'secondary'
    case 'STALE': return 'destructive'
    default: return 'secondary'
  }
}

export default async function ReceiptsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ matchStatus?: string; businessId?: string }>
}) {
  const params = await searchParams
  const VALID_STATUSES = STATUS_TABS.filter(Boolean)
  const activeStatus = VALID_STATUSES.includes(params.matchStatus as typeof VALID_STATUSES[number])
    ? params.matchStatus!
    : ''

  const qs = new URLSearchParams()
  if (activeStatus) qs.set('matchStatus', activeStatus)
  if (params.businessId) qs.set('businessId', params.businessId)

  let receipts: ReceiptItem[] = []
  let loadError = false
  try {
    const res = await apiRequestAuthenticated<{ receipts: ReceiptItem[] }>(
      `/receipts${qs.size ? `?${qs}` : ''}`
    )
    receipts = Array.isArray(res.receipts) ? res.receipts : []
  } catch {
    loadError = true
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Receipt Inbox</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {loadError ? 'Unable to load receipts' : `${receipts.length} receipt${receipts.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-md px-4 py-3 text-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, white)', color: 'var(--color-destructive)' }}
        >
          Unable to load receipts. Please try again.
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {STATUS_TABS.map((s) => (
          <Link
            key={s || 'all'}
            href={s ? `?matchStatus=${s}` : '?'}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeStatus === s
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            )}
          >
            {s || 'All'}
          </Link>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">File</TableHead>
                <TableHead scope="col">Phone</TableHead>
                <TableHead scope="col">Captured</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col" className="text-right">Amount Hint</TableHead>
                <TableHead scope="col">Date Hint</TableHead>
                <TableHead scope="col">Supplier Hint</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <Receipt className="mx-auto mb-2 h-8 w-8" style={{ color: 'var(--color-muted-foreground)' }} />
                    <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No receipts found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                receipts.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {isSafeUrl(r.storagePath) ? (
                        <a
                          href={r.storagePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm hover:underline"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {r.fileName}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--color-foreground)' }}>{r.fileName}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      {r.uploaderPhone}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      {new Date(r.capturedAt).toLocaleDateString('en-ZA')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={matchStatusVariant(r.matchStatus)}>
                        {r.matchStatus}{r.isStale ? ' ⚠' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {r.hintAmountCents != null
                        ? `R ${(r.hintAmountCents / 100).toFixed(2)}`
                        : <span style={{ color: 'var(--color-muted-foreground)' }}>—</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {r.hintDate
                        ? new Date(r.hintDate).toLocaleDateString('en-ZA')
                        : <span style={{ color: 'var(--color-muted-foreground)' }}>—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.hintSupplier ?? <span style={{ color: 'var(--color-muted-foreground)' }}>—</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
