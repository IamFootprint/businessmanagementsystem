import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

type MyReceipt = {
  id: string
  hintSupplier: string | null
  hintAmountCents: number | null
  hintDate: string | null
  hintBusinessId: string | null
  matchStatus: 'UNMATCHED' | 'SUGGESTED' | 'MATCHED' | 'STALE'
  capturedAt: string
  storagePath: string
  transactionId: string | null
}

async function getMyReceipts(): Promise<MyReceipt[]> {
  try {
    const r = await apiRequestAuthenticated<{ data: MyReceipt[] }>('/receipts/mine')
    return r.data
  } catch {
    return []
  }
}

function formatR(cents: number | null): string {
  if (cents == null) return '—'
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatusBadge({ status }: { status: MyReceipt['matchStatus'] }) {
  const map: Record<MyReceipt['matchStatus'], { Icon: typeof CheckCircle2; bg: string; fg: string; label: string }> = {
    MATCHED:   { Icon: CheckCircle2,  bg: 'rgba(52, 211, 153, 0.16)', fg: 'var(--color-pos)',  label: 'Submitted' },
    UNMATCHED: { Icon: Clock,         bg: 'rgba(251, 146, 60, 0.16)', fg: 'var(--color-warn)', label: 'Pending' },
    SUGGESTED: { Icon: Clock,         bg: 'rgba(251, 146, 60, 0.16)', fg: 'var(--color-warn)', label: 'In review' },
    STALE:     { Icon: AlertTriangle, bg: 'rgba(248, 113, 113, 0.14)', fg: 'var(--color-bad)', label: 'Stale' },
  }
  const s = map[status]
  const Icon = s.Icon
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[.05em]"
      style={{ background: s.bg, color: s.fg }}
    >
      <Icon size={10} />
      {s.label}
    </span>
  )
}

export default async function SubmissionsPage() {
  const receipts = await getMyReceipts()

  return (
    <div className="flex flex-col gap-4 px-4 pb-10 pt-5">
      <Link href="/driver" className="flex items-center gap-1 text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
        <ArrowLeft size={14} />
        Back
      </Link>

      <h1 className="text-[22px] font-semibold" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}>
        My submissions
      </h1>

      {receipts.length === 0 ? (
        <div
          className="rounded-xl px-4 py-8 text-center text-[13px]"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-ink-3)' }}
        >
          No submissions yet. Tap <span style={{ color: 'var(--color-accent)' }}>Capture receipt</span> to start.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {receipts.map((r) => (
            <li
              key={r.id}
              className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <img
                src={r.storagePath}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
                style={{ background: 'var(--color-surface-2)' }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="truncate text-[14px] font-semibold"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {r.hintSupplier ?? 'Unknown merchant'}
                  </p>
                  <StatusBadge status={r.matchStatus} />
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11.5px]" style={{ color: 'var(--color-ink-3)' }}>
                  <span className="tabular-nums" style={{ color: 'var(--color-ink-2)' }}>{formatR(r.hintAmountCents)}</span>
                  <span>{r.hintDate ? new Date(r.hintDate).toLocaleDateString() : 'date —'}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
