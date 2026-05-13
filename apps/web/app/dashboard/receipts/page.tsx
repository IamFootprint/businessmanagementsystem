import { apiRequestAuthenticated } from '@/lib/api-client.server'

type Receipt = {
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

type ReceiptsResponse = { receipts: Receipt[] }

const STATUS_COLORS: Record<string, string> = {
  MATCHED: 'green',
  SUGGESTED: 'orange',
  UNMATCHED: 'gray',
  STALE: 'red',
}

export default async function ReceiptsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ matchStatus?: string; businessId?: string }>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  if (params.matchStatus) qs.set('matchStatus', params.matchStatus)
  if (params.businessId) qs.set('businessId', params.businessId)

  const { receipts } = await apiRequestAuthenticated<ReceiptsResponse>(
    `/receipts${qs.size ? `?${qs}` : ''}`
  )

  const statuses = ['UNMATCHED', 'SUGGESTED', 'MATCHED', 'STALE']

  return (
    <div>
      <h1>Receipt Inbox</h1>

      <nav>
        {statuses.map((s) => (
          <a
            key={s}
            href={`?matchStatus=${s}`}
            style={{ marginRight: 8, fontWeight: params.matchStatus === s ? 'bold' : 'normal' }}
          >
            {s}
          </a>
        ))}
        <a href="?">All</a>
      </nav>

      {receipts.length === 0 ? (
        <p>No receipts found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Phone</th>
              <th>Captured</th>
              <th>Status</th>
              <th>Amount Hint</th>
              <th>Date Hint</th>
              <th>Supplier Hint</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id}>
                <td>
                  <a href={r.storagePath} target="_blank" rel="noopener noreferrer">
                    {r.fileName}
                  </a>
                </td>
                <td>{r.uploaderPhone}</td>
                <td>{new Date(r.capturedAt).toLocaleDateString('en-ZA')}</td>
                <td style={{ color: STATUS_COLORS[r.matchStatus] ?? 'inherit' }}>
                  {r.matchStatus}
                  {r.isStale ? ' ⚠' : ''}
                </td>
                <td>{r.hintAmountCents != null ? `R${(r.hintAmountCents / 100).toFixed(2)}` : '—'}</td>
                <td>{r.hintDate ? new Date(r.hintDate).toLocaleDateString('en-ZA') : '—'}</td>
                <td>{r.hintSupplier ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
