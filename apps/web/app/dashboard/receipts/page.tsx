import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { ReceiptsClient } from './ReceiptsClient'

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

export default async function ReceiptsInboxPage() {
  let receipts: ReceiptItem[] = []
  let loadError: string | null = null

  try {
    const res = await apiRequestAuthenticated<{ receipts: ReceiptItem[] }>('/receipts')
    receipts = Array.isArray(res.receipts) ? res.receipts : []
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load receipts'
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-6 p-8">
        <h1
          className="text-[26px] font-semibold tracking-[-0.02em]"
          style={{ color: 'var(--color-ink)' }}
        >
          Receipt inbox
        </h1>
        <div
          role="alert"
          className="rounded-md px-4 py-3 text-[13px]"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-bad) 8%, transparent)',
            color: 'var(--color-bad)',
          }}
        >
          Unable to load receipts: {loadError}
        </div>
      </div>
    )
  }

  return <ReceiptsClient receipts={receipts} />
}
