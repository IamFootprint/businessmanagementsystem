import { apiRequestAuthenticated } from '@/lib/api-client.server'

type Transaction = {
  id: string
  transactionDate: string
  rawDescription: string
  amountCents: number
  reviewStatus: string
  categoryId: string | null
  category: { id: string; name: string } | null
  bankAccount: { nickname: string; bankName: string }
  business: { id: string; name: string } | null
}

type TransactionsResponse = {
  data: Transaction[]
  meta: { total: number; page: number; pageSize: number; pages: number }
}

async function getTransactions(reviewStatus: string, page: string) {
  const params = new URLSearchParams({ reviewStatus, pageSize: '50', page })
  try {
    return await apiRequestAuthenticated<TransactionsResponse>(`/transactions?${params}`)
  } catch {
    return { data: [], meta: { total: 0, page: 1, pageSize: 50, pages: 0 } }
  }
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const reviewStatus = params.reviewStatus ?? 'NEEDS_REVIEW'
  const page = params.page ?? '1'
  const { data: transactions, meta } = await getTransactions(reviewStatus, page)

  const statusOptions = ['NEEDS_REVIEW', 'REVIEWED', 'UNCLEAR']

  return (
    <main style={{ padding: 32 }}>
      <h1>Transaction Review</h1>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        {statusOptions.map(s => (
          <a
            key={s}
            href={`/dashboard/transactions?reviewStatus=${s}`}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              background: reviewStatus === s ? '#333' : '#eee',
              color: reviewStatus === s ? '#fff' : '#333',
              textDecoration: 'none',
              fontSize: 13,
            }}
          >
            {s.replace('_', ' ')}
          </a>
        ))}
        <a
          href="/dashboard/transactions/apply-rules"
          style={{ marginLeft: 'auto', padding: '4px 12px', background: '#007bff', color: '#fff', borderRadius: 4, textDecoration: 'none', fontSize: 13 }}
        >
          Apply Rules
        </a>
      </div>

      <p style={{ color: '#666', fontSize: 13 }}>
        {meta.total} transactions | Page {meta.page} of {Math.max(1, meta.pages)}
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
            <th style={{ padding: '8px 4px' }}>Date</th>
            <th style={{ padding: '8px 4px' }}>Account</th>
            <th style={{ padding: '8px 4px' }}>Description</th>
            <th style={{ padding: '8px 4px', textAlign: 'right' }}>Amount</th>
            <th style={{ padding: '8px 4px' }}>Status</th>
            <th style={{ padding: '8px 4px' }}>Category</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <tr key={txn.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>
                {new Date(txn.transactionDate).toLocaleDateString('en-ZA')}
              </td>
              <td style={{ padding: '6px 4px', fontSize: 11, color: '#666' }}>
                {txn.bankAccount.nickname}
              </td>
              <td style={{ padding: '6px 4px', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {txn.rawDescription}
              </td>
              <td style={{ padding: '6px 4px', textAlign: 'right', color: txn.amountCents < 0 ? '#c00' : '#060' }}>
                {txn.amountCents < 0 ? '-' : '+'}R {(Math.abs(txn.amountCents) / 100).toFixed(2)}
              </td>
              <td style={{ padding: '6px 4px' }}>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: 3,
                  fontSize: 11,
                  background: txn.reviewStatus === 'NEEDS_REVIEW' ? '#fff3cd' : txn.reviewStatus === 'REVIEWED' ? '#d4edda' : '#f8d7da',
                }}>
                  {txn.reviewStatus}
                </span>
              </td>
              <td style={{ padding: '6px 4px', fontSize: 12, color: txn.category ? '#333' : '#999' }}>
                {txn.category?.name ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {transactions.length === 0 && (
        <p style={{ color: '#666', marginTop: 16 }}>No transactions found.</p>
      )}

      {meta.pages > 1 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          {meta.page > 1 && (
            <a href={`/dashboard/transactions?reviewStatus=${reviewStatus}&page=${meta.page - 1}`}>← Prev</a>
          )}
          {meta.page < meta.pages && (
            <a href={`/dashboard/transactions?reviewStatus=${reviewStatus}&page=${meta.page + 1}`}>Next →</a>
          )}
        </div>
      )}
    </main>
  )
}
