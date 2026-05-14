'use client'

import { useEffect, useRef, useState } from 'react'
import { Lock, LockOpen, FileDown, FileText } from 'lucide-react'
import { StatusPillFromStatus } from '@/components/ui/status-pill'
import { useToast } from '@/lib/use-toast'

type Period = {
  id: string
  businessId: string
  year: number
  month: number
  status: string
  lockedAt: string | null
}

type CategoryItem = {
  categoryId: string
  name: string
  amountCents: number
  color?: string
}

type SnapshotData = {
  businessId: string
  year: number
  month: number
  generatedAt: string
  totalRevenueCents: number
  totalExpenseCents: number
  netProfitCents: number
  revenueByCategory: CategoryItem[]
  expenseByCategory: CategoryItem[]
  uncategorisedRevenueCents: number
  uncategorisedExpenseCents: number
  transactionCount: number
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function fmt(cents: number) {
  return (Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function periodLabel(p: Period) {
  return `${MONTH_NAMES[p.month - 1]} ${p.year}`
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  valueColor,
  footer,
}: {
  label: string
  value: string
  valueColor: string
  footer: string
}) {
  return (
    <div
      className="rounded-[10px] border p-5"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-panel)',
      }}
    >
      <p
        className="text-[11.5px] font-semibold uppercase tracking-[.04em]"
        style={{ color: 'var(--color-ink-3)' }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-[28px] font-semibold tracking-[-0.02em] tabular-nums"
        style={{ color: valueColor }}
      >
        R {value}
      </p>
      <p className="mt-1 text-[11.5px]" style={{ color: 'var(--color-ink-3)' }}>
        {footer}
      </p>
    </div>
  )
}

// ─── Bar Chart Row ───────────────────────────────────────────────────────────

function BarRow({
  name,
  amountCents,
  maxCents,
  color,
}: {
  name: string
  amountCents: number
  maxCents: number
  color?: string
}) {
  const fillPct = maxCents > 0 ? (amountCents / maxCents) * 100 : 0
  const swatchColor = color ?? 'var(--color-ink-3)'
  const barColor = color ?? 'var(--color-accent)'

  return (
    <div
      className="grid gap-3 py-2 border-b"
      style={{
        gridTemplateColumns: '150px 1fr 90px',
        borderColor: 'var(--color-border-2)',
      }}
    >
      {/* Name + swatch */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="shrink-0 rounded"
          style={{ width: 6, height: 6, backgroundColor: swatchColor }}
        />
        <span
          className="truncate text-[13px]"
          style={{ color: 'var(--color-ink)' }}
        >
          {name}
        </span>
      </div>
      {/* Bar track */}
      <div
        className="flex items-center"
      >
        <div
          className="relative h-1.5 w-full rounded-full"
          style={{ backgroundColor: 'var(--color-border)' }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${fillPct}%`,
              backgroundColor: barColor,
              opacity: 0.85,
            }}
          />
        </div>
      </div>
      {/* Amount */}
      <p
        className="text-right text-[12px] font-mono tabular-nums"
        style={{ color: 'var(--color-ink-2)' }}
      >
        R {fmt(amountCents)}
      </p>
    </div>
  )
}

// ─── Breakdown Card ──────────────────────────────────────────────────────────

function BreakdownCard({
  title,
  periodLabel: pLabel,
  items,
  totalCents,
  emptyLabel,
  totalLabel,
}: {
  title: string
  periodLabel: string
  items: CategoryItem[]
  totalCents: number
  emptyLabel: string
  totalLabel: string
}) {
  const maxCents = items.reduce((m, i) => Math.max(m, i.amountCents), 0)

  return (
    <div
      className="rounded-[10px] border flex flex-col"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-panel)',
      }}
    >
      {/* Head */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <p
          className="text-[13px] font-semibold"
          style={{ color: 'var(--color-ink)' }}
        >
          {title}
        </p>
        <p
          className="text-[11.5px] mt-0.5"
          style={{ color: 'var(--color-ink-3)' }}
        >
          {pLabel}
        </p>
      </div>
      {/* Body */}
      <div className="flex-1 px-5">
        {items.length === 0 ? (
          <p
            className="py-8 text-center text-[13px]"
            style={{ color: 'var(--color-ink-3)' }}
          >
            {emptyLabel}
          </p>
        ) : (
          items.map((item) => (
            <BarRow
              key={item.categoryId}
              name={item.name}
              amountCents={item.amountCents}
              maxCents={maxCents}
              color={item.color}
            />
          ))
        )}
      </div>
      {/* Foot */}
      {items.length > 0 && (
        <div
          className="flex items-center justify-between border-t px-5 py-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
            {totalLabel}
          </span>
          <span
            className="text-[13px] font-semibold tabular-nums"
            style={{ color: 'var(--color-ink)' }}
          >
            R {fmt(totalCents)}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ReportsClient({ periods: initialPeriods }: { periods: Period[] }) {
  const [periods, setPeriods] = useState<Period[]>(initialPeriods)
  const [activePeriodId, setActivePeriodId] = useState<string | null>(
    initialPeriods[0]?.id ?? null
  )
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState(false)
  const [locking, setLocking] = useState(false)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  const { toast } = useToast()
  const abortRef = useRef<AbortController | null>(null)

  const activePeriod = periods.find((p) => p.id === activePeriodId) ?? null

  useEffect(() => {
    if (!activePeriodId) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    let cancelled = false
    setReportError(false)
    setReportLoading(true)
    setSnapshot(null)

    fetch(`/api/periods/${activePeriodId}/report`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((body) => {
        if (!cancelled) setSnapshot(body?.snapshot ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          setSnapshot(null)
          setReportError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setReportLoading(false)
      })

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [activePeriodId, fetchTrigger])

  async function handleLock() {
    if (!activePeriod) return
    const label = periodLabel(activePeriod)
    if (!window.confirm(`Lock ${label}? Locked periods can't be edited.`)) return

    setLocking(true)
    try {
      const res = await fetch(`/api/periods/${activePeriod.id}/lock`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setPeriods((prev) =>
        prev.map((p) =>
          p.id === activePeriod.id
            ? { ...p, status: 'LOCKED', lockedAt: new Date().toISOString() }
            : p
        )
      )
      toast('Period locked')
      setFetchTrigger((t) => t + 1)
    } catch {
      toast('Failed to lock period')
    } finally {
      setLocking(false)
    }
  }

  async function handleReopen() {
    if (!activePeriod) return
    setLocking(true)
    try {
      const res = await fetch(`/api/periods/${activePeriod.id}/reopen`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setPeriods((prev) =>
        prev.map((p) =>
          p.id === activePeriod.id ? { ...p, status: 'OPEN', lockedAt: null } : p
        )
      )
      toast('Period reopened')
      setFetchTrigger((t) => t + 1)
    } catch {
      toast('Failed to reopen period')
    } finally {
      setLocking(false)
    }
  }

  const margin =
    snapshot && snapshot.totalRevenueCents > 0
      ? ((snapshot.netProfitCents / snapshot.totalRevenueCents) * 100).toFixed(1)
      : null

  const netPositive = (snapshot?.netProfitCents ?? 0) >= 0

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-[26px] font-semibold tracking-[-0.02em]"
            style={{ color: 'var(--color-ink)' }}
          >
            Reports
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
            Profit &amp; Loss · Kgolaentle Holdings · VAT 4520198765
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            disabled
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-50"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-ink-2)',
            }}
          >
            <FileDown className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            disabled
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-50"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-ink-2)',
            }}
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div
        className="rounded-[10px] overflow-x-auto"
        style={{
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-panel)',
          padding: 6,
        }}
      >
        <div className="flex gap-1 min-w-max">
          {periods.length === 0 ? (
            <p
              className="px-3 py-2 text-[13px]"
              style={{ color: 'var(--color-ink-3)' }}
            >
              No periods found.
            </p>
          ) : (
            periods.map((p) => {
              const isActive = p.id === activePeriodId
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePeriodId(p.id)}
                  aria-pressed={isActive}
                  className="flex items-center gap-2 rounded-[7px] px-3 py-2 text-[13px] font-medium transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: isActive
                      ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                      : 'transparent',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-ink-2)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
                        'var(--color-panel-2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
                        'transparent'
                    }
                  }}
                >
                  {periodLabel(p)}
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold"
                    style={
                      p.status === 'LOCKED'
                        ? {
                            backgroundColor:
                              'color-mix(in srgb, var(--color-ok) 15%, transparent)',
                            color: 'var(--color-ok)',
                          }
                        : {
                            backgroundColor:
                              'color-mix(in srgb, var(--color-warn) 15%, transparent)',
                            color: 'var(--color-warn)',
                          }
                    }
                  >
                    {p.status === 'LOCKED' ? 'Locked' : 'Open'}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* P&L display */}
      {reportLoading ? (
        <p
          className="py-16 text-center text-[13px]"
          style={{ color: 'var(--color-ink-3)' }}
        >
          Loading report…
        </p>
      ) : reportError ? (
        <div
          role="alert"
          className="rounded-[10px] border px-4 py-3 text-[13px]"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-bad) 25%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-bad) 8%, transparent)',
            color: 'var(--color-bad)',
          }}
        >
          Unable to load report. Please try again.
        </div>
      ) : !snapshot ? (
        <div
          className="rounded-[10px] border py-16 text-center"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-panel)',
          }}
        >
          <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
            Lock the period first to generate a P&amp;L snapshot.
          </p>
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-4">
            <KpiCard
              label="Revenue"
              value={fmt(snapshot.totalRevenueCents)}
              valueColor="var(--color-pos)"
              footer={`${snapshot.revenueByCategory.length} categor${snapshot.revenueByCategory.length === 1 ? 'y' : 'ies'}`}
            />
            <KpiCard
              label="Expenses"
              value={fmt(snapshot.totalExpenseCents)}
              valueColor="var(--color-neg)"
              footer={`${snapshot.expenseByCategory.length} categor${snapshot.expenseByCategory.length === 1 ? 'y' : 'ies'}`}
            />
            <KpiCard
              label="Net profit"
              value={`${!netPositive ? '−' : ''}${fmt(snapshot.netProfitCents)}`}
              valueColor={netPositive ? 'var(--color-pos)' : 'var(--color-neg)'}
              footer={margin !== null ? `${margin}% margin` : '—'}
            />
          </div>

          {/* Breakdown grid */}
          {activePeriod && (
            <div className="grid grid-cols-2 gap-4">
              <BreakdownCard
                title="Expense breakdown"
                periodLabel={periodLabel(activePeriod)}
                items={snapshot.expenseByCategory}
                totalCents={snapshot.totalExpenseCents}
                emptyLabel="No expenses recorded"
                totalLabel="Total expenses:"
              />
              <BreakdownCard
                title="Income breakdown"
                periodLabel={periodLabel(activePeriod)}
                items={snapshot.revenueByCategory}
                totalCents={snapshot.totalRevenueCents}
                emptyLabel="No income recorded"
                totalLabel="Total income:"
              />
            </div>
          )}

          {/* Period status card */}
          {activePeriod && (
            <div
              className="rounded-[10px] border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-panel)',
              }}
            >
              <div className="grid grid-cols-4 divide-x" style={{ borderColor: 'var(--color-border)' }}>
                {[
                  {
                    label: 'Status',
                    value: (
                      <StatusPillFromStatus status={activePeriod.status} />
                    ),
                  },
                  {
                    label: 'Transactions',
                    value: (
                      <span
                        className="text-[15px] font-semibold tabular-nums"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {snapshot.transactionCount}
                      </span>
                    ),
                  },
                  {
                    label: 'Uncategorised',
                    value: (
                      <span
                        className="text-[15px] font-semibold tabular-nums"
                        style={{
                          color:
                            snapshot.uncategorisedExpenseCents + snapshot.uncategorisedRevenueCents > 0
                              ? 'var(--color-warn)'
                              : 'var(--color-ok)',
                        }}
                      >
                        {snapshot.uncategorisedExpenseCents + snapshot.uncategorisedRevenueCents > 0
                          ? `R ${fmt(snapshot.uncategorisedExpenseCents + snapshot.uncategorisedRevenueCents)}`
                          : 'None'}
                      </span>
                    ),
                  },
                  {
                    label: 'Locked at',
                    value: (
                      <span
                        className="text-[13px]"
                        style={{ color: 'var(--color-ink-2)' }}
                      >
                        {activePeriod.lockedAt
                          ? new Date(activePeriod.lockedAt).toLocaleDateString('en-ZA')
                          : '—'}
                      </span>
                    ),
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1 px-5 py-4">
                    <p
                      className="text-[10.5px] font-semibold uppercase tracking-[.06em]"
                      style={{ color: 'var(--color-ink-3)' }}
                    >
                      {label}
                    </p>
                    {value}
                  </div>
                ))}
              </div>
              <div
                className="flex items-center justify-end gap-2 border-t px-5 py-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {activePeriod.status === 'OPEN' && (
                  <button
                    onClick={handleLock}
                    disabled={locking}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Lock period
                  </button>
                )}
                {activePeriod.status === 'LOCKED' && (
                  <button
                    onClick={handleReopen}
                    disabled={locking}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--color-panel-2)] disabled:opacity-50"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-ink-2)',
                    }}
                  >
                    <LockOpen className="h-3.5 w-3.5" />
                    Reopen
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
