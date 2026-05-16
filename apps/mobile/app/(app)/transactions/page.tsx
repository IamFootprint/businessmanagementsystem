import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

// API contract — matches what /transactions actually returns
type ApiTransaction = {
  id: string
  transactionDate: string
  rawDescription: string
  cleanDescription?: string
  amountCents: number
  direction: 'CREDIT' | 'DEBIT'
  reviewStatus?: string
  category?: { id: string; name: string; color?: string } | null
}

// Local view-model
type Transaction = {
  id: string
  description: string
  amountCents: number
  type: 'INCOME' | 'EXPENSE'
  date: string
  categoryName?: string
  reviewStatus?: string
}

function toView(t: ApiTransaction): Transaction {
  return {
    id: t.id,
    description: t.cleanDescription || t.rawDescription || '',
    amountCents: Math.abs(t.amountCents),
    type: t.direction === 'CREDIT' ? 'INCOME' : 'EXPENSE',
    date: t.transactionDate,
    categoryName: t.category?.name,
    reviewStatus: t.reviewStatus,
  }
}

type Meta = { total: number; page: number; pageSize: number }

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(cents: number): string {
  return `R ${(Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function groupByDate(txs: Transaction[]): Array<{ date: string; items: Transaction[] }> {
  const map = new Map<string, Transaction[]>()
  for (const tx of txs) {
    if (!tx.date) continue
    const d = String(tx.date).split('T')[0]
    if (!map.has(d)) map.set(d, [])
    map.get(d)!.push(tx)
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }))
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>
}) {
  const { type, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const pageSize = 30

  const qs = new URLSearchParams({ pageSize: String(pageSize), page: String(page) })
  if (type === 'INCOME' || type === 'EXPENSE') qs.set('type', type)

  let transactions: Transaction[] = []
  let meta: Meta = { total: 0, page: 1, pageSize }
  let error = false

  try {
    const res = await apiRequestAuthenticated<{ data: ApiTransaction[]; meta: Meta }>(
      `/transactions?${qs}`
    )
    transactions = (res.data ?? []).map(toView)
    meta = res.meta ?? { total: 0, page: 1, pageSize }
  } catch {
    error = true
  }

  const groups = groupByDate(transactions)

  const FILTERS: Array<{ label: string; value?: string }> = [
    { label: 'All' },
    { label: 'Income', value: 'INCOME' },
    { label: 'Expense', value: 'EXPENSE' },
  ]

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 pb-3 pt-5"
        style={{
          background: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <h1
          className="mb-3 text-[22px] font-semibold tracking-[-0.01em] animate-fade-in"
          style={{ color: 'var(--color-ink)' }}
        >
          Transactions
        </h1>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map(({ label, value }) => {
            const active = (type ?? undefined) === value
            return (
              <a
                key={label}
                href={value ? `?type=${value}` : '?'}
                className="shrink-0 rounded-pill px-3.5 py-1.5 text-[13px] font-medium transition-colors"
                style={{
                  background: active ? 'var(--color-accent)' : 'var(--color-surface-2)',
                  color: active ? 'var(--color-accent-fg)' : 'var(--color-ink-2)',
                  border: active ? 'none' : '1px solid var(--color-border)',
                }}
              >
                {label}
              </a>
            )
          })}
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <AlertCircle size={32} style={{ color: 'var(--color-bad)' }} />
          <p className="text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Failed to load transactions
          </p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
          <p className="text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            No transactions found
          </p>
        </div>
      ) : (
        <div className="px-4 pt-4 animate-fade-up">
          {/* Total count */}
          <p className="mb-3 text-[12px] font-medium" style={{ color: 'var(--color-ink-3)' }}>
            {meta.total.toLocaleString()} total
          </p>

          <div className="flex flex-col gap-4">
            {groups.map(({ date, items }) => (
              <div key={date}>
                <p
                  className="mb-2 text-[11px] font-semibold uppercase tracking-[.08em]"
                  style={{ color: 'var(--color-ink-3)' }}
                >
                  {formatDate(date)}
                </p>
                <div
                  className="card overflow-hidden rounded-xl"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {items.map((tx, i) => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 px-4 py-3.5"
                      style={{
                        borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                      }}
                    >
                      {/* Type icon */}
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: tx.type === 'INCOME' ? 'var(--pos-bg)' : 'var(--neg-bg)',
                        }}
                      >
                        {tx.type === 'INCOME'
                          ? <TrendingUp size={16} style={{ color: 'var(--color-pos)' }} />
                          : <TrendingDown size={16} style={{ color: 'var(--color-neg)' }} />
                        }
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <p
                          className="truncate text-[13px] font-medium"
                          style={{ color: 'var(--color-ink)' }}
                        >
                          {tx.description || tx.categoryName || '—'}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {tx.categoryName && (
                            <span className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
                              {tx.categoryName}
                            </span>
                          )}
                          {tx.reviewStatus === 'NEEDS_REVIEW' && (
                            <span
                              className="rounded-sm px-1 py-0.5 text-[10px] font-medium uppercase tracking-[.04em]"
                              style={{ background: 'rgba(251,146,60,0.12)', color: 'var(--color-warn)' }}
                            >
                              Review
                            </span>
                          )}
                        </div>
                      </div>

                      <p
                        className="shrink-0 text-[14px] font-semibold tabular-nums"
                        style={{
                          fontFamily: 'var(--font-display)',
                          color: tx.type === 'INCOME' ? 'var(--color-pos)' : 'var(--color-neg)',
                        }}
                      >
                        {tx.type === 'INCOME' ? '+' : '−'}{fmt(tx.amountCents)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta.total > pageSize && (
            <div className="flex justify-between py-6">
              {page > 1 ? (
                <a
                  href={`?${type ? `type=${type}&` : ''}page=${page - 1}`}
                  className="rounded-lg px-4 py-2.5 text-[13px] font-medium"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-ink-2)' }}
                >
                  ← Prev
                </a>
              ) : <span />}
              {page * pageSize < meta.total && (
                <a
                  href={`?${type ? `type=${type}&` : ''}page=${page + 1}`}
                  className="rounded-lg px-4 py-2.5 text-[13px] font-medium"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-ink-2)' }}
                >
                  Next →
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
