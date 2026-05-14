import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { Receipt, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

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

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(cents: number): string {
  return `R ${(Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function MatchBadge({ status }: { status: string }) {
  if (status === 'MATCHED') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[.05em]"
        style={{ background: 'var(--pos-bg)', color: 'var(--color-pos)' }}
      >
        <CheckCircle2 size={9} strokeWidth={2.5} /> Matched
      </span>
    )
  }
  if (status === 'UNMATCHED') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[.05em]"
        style={{ background: 'rgba(251,146,60,0.12)', color: 'var(--color-warn)' }}
      >
        <Clock size={9} strokeWidth={2.5} /> Unmatched
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[.05em]"
      style={{ background: 'var(--color-surface-3)', color: 'var(--color-ink-3)' }}
    >
      {status}
    </span>
  )
}

export default async function ReceiptsPage() {
  let receipts: ReceiptItem[] = []
  let error: string | null = null

  try {
    const res = await apiRequestAuthenticated<{ receipts: ReceiptItem[] }>('/receipts')
    receipts = Array.isArray(res.receipts) ? res.receipts : []
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load receipts'
  }

  const unmatched = receipts.filter(r => r.matchStatus === 'UNMATCHED')
  const matched = receipts.filter(r => r.matchStatus === 'MATCHED')

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className="px-4 pb-4 pt-5"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <h1
          className="text-[22px] font-semibold tracking-[-0.01em] animate-fade-in"
          style={{ color: 'var(--color-ink)' }}
        >
          Receipts
        </h1>
        <div className="mt-2 flex gap-3">
          <span className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
            <span style={{ color: 'var(--color-warn)', fontWeight: 600 }}>{unmatched.length}</span> unmatched
          </span>
          <span className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
            <span style={{ color: 'var(--color-pos)', fontWeight: 600 }}>{matched.length}</span> matched
          </span>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <AlertCircle size={32} style={{ color: 'var(--color-bad)' }} />
          <p className="text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            {error}
          </p>
        </div>
      ) : receipts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-20 text-center animate-fade-in">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'var(--accent-dim)' }}
          >
            <Receipt size={24} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <p className="text-[15px] font-medium" style={{ color: 'var(--color-ink)' }}>
              No receipts yet
            </p>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
              Upload receipts via WhatsApp or the upload link
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-4 pt-4 animate-fade-up">
          {/* Unmatched */}
          {unmatched.length > 0 && (
            <section>
              <p
                className="mb-2.5 text-[11px] font-semibold uppercase tracking-[.08em]"
                style={{ color: 'var(--color-warn)' }}
              >
                Needs attention · {unmatched.length}
              </p>
              <div
                className="card overflow-hidden rounded-xl"
                style={{ borderColor: 'rgba(251,146,60,0.25)' }}
              >
                {unmatched.map((r, i) => (
                  <div
                    key={r.id}
                    className="flex items-start gap-3 px-4 py-3.5"
                    style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}
                  >
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: 'rgba(251,146,60,0.1)' }}
                    >
                      <Receipt size={16} style={{ color: 'var(--color-warn)' }} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate text-[13px] font-medium" style={{ color: 'var(--color-ink)' }}>
                        {r.hintSupplier ?? r.fileName}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
                        {formatDate(r.capturedAt)}
                        {r.uploaderPhone && ` · ${r.uploaderPhone}`}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <MatchBadge status={r.matchStatus} />
                        {r.hintAmountCents != null && (
                          <span className="text-[12px] font-medium" style={{ color: 'var(--color-ink-2)' }}>
                            {fmt(r.hintAmountCents)}
                          </span>
                        )}
                        {r.isStale && (
                          <span className="text-[11px]" style={{ color: 'var(--color-bad)' }}>Stale</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Matched */}
          {matched.length > 0 && (
            <section>
              <p
                className="mb-2.5 text-[11px] font-semibold uppercase tracking-[.08em]"
                style={{ color: 'var(--color-ink-3)' }}
              >
                Matched · {matched.length}
              </p>
              <div
                className="card overflow-hidden rounded-xl"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {matched.map((r, i) => (
                  <div
                    key={r.id}
                    className="flex items-start gap-3 px-4 py-3.5"
                    style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}
                  >
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: 'var(--pos-bg)' }}
                    >
                      <Receipt size={16} style={{ color: 'var(--color-pos)' }} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate text-[13px] font-medium" style={{ color: 'var(--color-ink)' }}>
                        {r.hintSupplier ?? r.fileName}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
                        {formatDate(r.capturedAt)}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <MatchBadge status={r.matchStatus} />
                        {r.hintAmountCents != null && (
                          <span className="text-[12px] font-medium" style={{ color: 'var(--color-ink-2)' }}>
                            {fmt(r.hintAmountCents)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
