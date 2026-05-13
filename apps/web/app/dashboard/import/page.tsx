'use client'
import { useActionState } from 'react'
import { CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react'
import { importCsvAction } from './actions'
import type { ImportState } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return `R ${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export default function ImportPage() {
  const [state, formAction, isPending] = useActionState<ImportState, FormData>(
    importCsvAction,
    null
  )

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Import Bank Statement</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Upload a Standard Bank CSV file to add new transactions.
        </p>
      </div>

      <div className="max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload CSV</CardTitle>
            <CardDescription>Standard Bank transaction export format</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              {state?.error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md px-3 py-2 text-sm"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 10%, white)', color: 'var(--color-destructive)' }}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {state.error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountId">Bank Account ID</Label>
                <Input
                  id="bankAccountId"
                  name="bankAccountId"
                  type="text"
                  required
                  placeholder="seed-stdbank-main"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="file">CSV File</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  accept=".csv,text/csv"
                  required
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                  <>Importing…</>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Import Statement
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {state?.summary && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--color-success)' }} />
                <CardTitle className="text-base" style={{ color: 'var(--color-success)' }}>Import complete</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                {([
                  ['File', state.summary.fileName],
                  ['Total rows', state.summary.rowCount],
                  ['Imported', state.summary.importedCount],
                  ['Duplicates skipped', state.summary.duplicateCount],
                  ['Errors', state.summary.errorCount],
                  ['Opening balance', formatCents(state.summary.openingBalanceCents)],
                  ['Closing balance', formatCents(state.summary.closingBalanceCents)],
                ] as [string, string | number | null | undefined][]).map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <dt style={{ color: 'var(--color-muted-foreground)' }}>{label}</dt>
                    <dd
                      className="font-medium"
                      style={{ color: label === 'Errors' && Number(value) > 0 ? 'var(--color-destructive)' : 'var(--color-foreground)' }}
                    >
                      {String(value ?? '—')}
                    </dd>
                  </div>
                ))}
              </dl>
              <Separator className="my-4" />
              <Button asChild variant="outline" size="sm" className="w-full">
                <a href="/dashboard/transactions?reviewStatus=NEEDS_REVIEW">
                  Review imported transactions →
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
