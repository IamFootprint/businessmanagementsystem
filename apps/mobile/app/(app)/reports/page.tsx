import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { Lock, LockOpen, ChevronRight, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import Link from 'next/link'

type Period = {
  id: string
  year: number
  month: number
  status: string
  lockedAt: string | null
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function PeriodStatusBadge({ status }: { status: string }) {
  if (status === 'LOCKED') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[.05em]"
        style={{ background: 'var(--pos-bg)', color: 'var(--color-pos)' }}
      >
        <Lock size={9} strokeWidth={2.5} /> Locked
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[.05em]"
      style={{ background: 'rgba(251,146,60,0.12)', color: 'var(--color-warn)' }}
    >
      <LockOpen size={9} strokeWidth={2.5} /> Open
    </span>
  )
}

export default async function ReportsPage() {
  let periods: Period[] = []
  let error = false

  try {
    const res = await apiRequestAuthenticated<{ periods: Period[] }>('/periods')
    periods = (res.periods ?? []).sort((a, b) =>
      b.year !== a.year ? b.year - a.year : b.month - a.month
    )
  } catch {
    error = true
  }

  const lockedPeriods = periods.filter(p => p.status === 'LOCKED')
  const openPeriods = periods.filter(p => p.status === 'OPEN')

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
          Reports
        </h1>
        <p className="mt-1 text-[13px] animate-fade-in delay-1" style={{ color: 'var(--color-ink-3)' }}>
          {lockedPeriods.length} period{lockedPeriods.length !== 1 ? 's' : ''} locked
        </p>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <AlertCircle size={32} style={{ color: 'var(--color-bad)' }} />
          <p className="text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Failed to load periods
          </p>
        </div>
      ) : periods.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-20 text-center animate-fade-in">
          <p className="text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            No periods yet
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-4 pt-4 animate-fade-up">
          {/* Open periods */}
          {openPeriods.length > 0 && (
            <section>
              <p
                className="mb-2.5 text-[11px] font-semibold uppercase tracking-[.08em]"
                style={{ color: 'var(--color-warn)' }}
              >
                In Progress
              </p>
              <div
                className="card overflow-hidden rounded-xl"
                style={{ borderColor: 'rgba(251,146,60,0.25)' }}
              >
                {openPeriods.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/reports/${p.id}`}
                    className="flex items-center justify-between px-4 py-4"
                    style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-[15px] font-semibold" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}>
                        {MONTHS[p.month - 1]} {p.year}
                      </p>
                      <PeriodStatusBadge status={p.status} />
                    </div>
                    <ChevronRight size={18} style={{ color: 'var(--color-ink-3)' }} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Locked periods */}
          {lockedPeriods.length > 0 && (
            <section>
              <p
                className="mb-2.5 text-[11px] font-semibold uppercase tracking-[.08em]"
                style={{ color: 'var(--color-ink-3)' }}
              >
                Locked Reports · {lockedPeriods.length}
              </p>
              <div
                className="card overflow-hidden rounded-xl"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {lockedPeriods.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/reports/${p.id}`}
                    className="flex items-center justify-between px-4 py-4"
                    style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-[15px] font-semibold" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}>
                        {MONTHS[p.month - 1]} {p.year}
                      </p>
                      <div className="flex items-center gap-2">
                        <PeriodStatusBadge status={p.status} />
                        {p.lockedAt && (
                          <span className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
                            Locked {formatDate(p.lockedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: 'var(--color-ink-3)' }} />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
