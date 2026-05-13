'use client'
import { useActionState } from 'react'
import { uploadReceiptAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react'

type State = { error?: string; success?: boolean }

export function UploadReceiptForm() {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    uploadReceiptAction,
    {}
  )

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-10 w-10" style={{ color: 'var(--color-success)' }} />
        <p className="font-medium" style={{ color: 'var(--color-foreground)' }}>Receipt submitted!</p>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Your receipt has been received and will be matched to a transaction.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div role="alert" aria-live="assertive" aria-atomic="true" className="flex items-start gap-2 rounded-md px-3 py-2 text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 10%, white)', color: 'var(--color-destructive)' }}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <input type="hidden" id="gps-lat" name="lat" />
      <input type="hidden" id="gps-lng" name="lng" />

      <div className="space-y-1.5">
        <Label htmlFor="phone">Your phone number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="+27 82 123 4567"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="file">Receipt image or PDF</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept="image/*,application/pdf"
          required
        />
        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Max 10 MB</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hintAmount">Amount (optional)</Label>
        <Input
          id="hintAmount"
          name="hintAmount"
          type="number"
          step="0.01"
          placeholder="150.00"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hintDate">Date (optional)</Label>
        <Input
          id="hintDate"
          name="hintDate"
          type="date"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hintSupplier">Supplier name (optional)</Label>
        <Input
          id="hintSupplier"
          name="hintSupplier"
          type="text"
          placeholder="Pick n Pay, Builders, etc."
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          'Uploading…'
        ) : (
          <>
            <UploadCloud className="h-4 w-4" />
            Submit Receipt
          </>
        )}
      </Button>
    </form>
  )
}
