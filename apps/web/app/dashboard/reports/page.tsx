import Link from 'next/link'
import { Lock, LockOpen, Download } from 'lucide-react'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

type Period = {
  id: string
  businessId: string
  year: number
  month: number
  status: string
  lockedAt: string | null
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function periodStatusVariant(status: string): 'success' | 'warning' | 'secondary' {
  if (status === 'LOCKED') return 'success'
  if (status === 'OPEN') return 'warning'
  return 'secondary'
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>
}) {
  const params = await searchParams
  const businessId = params.businessId

  if (!businessId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Reports</h1>
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Add <code className="rounded px-1 py-0.5 text-xs" style={{ backgroundColor: 'var(--color-muted)' }}>?businessId=&lt;id&gt;</code> to the URL to view periods for a business.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  let periods: Period[] = []
  let loadError = false
  try {
    const res = await apiRequestAuthenticated<{ periods: Period[] }>(`/periods?businessId=${encodeURIComponent(businessId)}`)
    periods = res.periods
  } catch {
    loadError = true
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Reports</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {loadError ? 'Unable to load periods' : `${periods.length} period${periods.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {loadError && (
        <div
          className="rounded-md px-4 py-3 text-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, white)', color: 'var(--color-destructive)' }}
        >
          Unable to load periods. Please try again.
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Period</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Locked At</TableHead>
                <TableHead scope="col" className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    No periods found.
                  </TableCell>
                </TableRow>
              ) : (
                periods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </TableCell>
                    <TableCell>
                      <Badge variant={periodStatusVariant(p.status)}>
                        {p.status === 'LOCKED'
                          ? <><Lock className="mr-1 inline h-3 w-3" />{p.status}</>
                          : <><LockOpen className="mr-1 inline h-3 w-3" />{p.status}</>
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                      {p.lockedAt ? new Date(p.lockedAt).toLocaleDateString('en-ZA') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.status === 'LOCKED' && (
                          <>
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/dashboard/reports/${p.id}`}>View</Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <a href={`/api/periods/${p.id}/export`} download>
                                <Download className="h-4 w-4" />
                                CSV
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
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
