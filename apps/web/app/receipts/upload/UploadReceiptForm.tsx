'use client'
import { useActionState } from 'react'

type State = { error?: string; success?: boolean }

export function UploadReceiptForm({
  action,
}: {
  action: (prev: State, formData: FormData) => Promise<State>
}) {
  const [state, formAction, pending] = useActionState(action, {})

  if (state.success) {
    return <p>Receipt uploaded successfully. Thank you!</p>
  }

  return (
    <form action={formAction} encType="multipart/form-data">
      <input type="hidden" id="gps-lat" name="lat" />
      <input type="hidden" id="gps-lng" name="lng" />

      <div>
        <label htmlFor="phone">Your phone number</label>
        <input id="phone" name="phone" type="tel" required placeholder="+27 82 000 0000" />
      </div>

      <div>
        <label htmlFor="file">Receipt (photo or PDF)</label>
        <input id="file" name="file" type="file" required accept="image/*,application/pdf" />
      </div>

      <div>
        <label htmlFor="hintAmount">Amount (optional)</label>
        <input id="hintAmount" name="hintAmount" type="number" step="0.01" placeholder="e.g. 50.00" />
      </div>

      <div>
        <label htmlFor="hintDate">Date on receipt (optional)</label>
        <input id="hintDate" name="hintDate" type="date" />
      </div>

      <div>
        <label htmlFor="hintSupplier">Supplier name (optional)</label>
        <input id="hintSupplier" name="hintSupplier" type="text" placeholder="e.g. Pick n Pay" />
      </div>

      {state.error && <p style={{ color: 'red' }}>{state.error}</p>}

      <button type="submit" disabled={pending}>
        {pending ? 'Uploading...' : 'Upload Receipt'}
      </button>
    </form>
  )
}
