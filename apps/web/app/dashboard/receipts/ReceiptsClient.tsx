'use client'

import { useEffect, useState } from 'react'
import { Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/lib/use-toast'
import { Drawer } from '@/components/ui/drawer'
import { StatusPillFromStatus } from '@/components/ui/status-pill'

// ─── Types ────────────────────────────────────────────────────────────────────

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

type Transaction = {
  id: string
  transactionDate: string
  rawDescription: string
  amountCents: number
  direction: string
}

type Candidate = {
  transaction: Transaction
  confidence: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function receiptStatusToPill(matchStatus: string): string {
  switch (matchStatus) {
    case 'MATCHED': return 'REVIEWED'
    case 'SUGGESTED': return 'UNCLEAR'
    case 'UNMATCHED': return 'NEEDS_REVIEW'
    case 'STALE': return 'LOCKED'
    default: return 'NEEDS_REVIEW'
  }
}

function thumbnailBg(matchStatus: string): string {
  switch (matchStatus) {
    case 'MATCHED': return 'color-mix(in srgb, var(--color-ok) 10%, transparent)'
    case 'SUGGESTED': return 'color-mix(in srgb, var(--color-warn) 10%, transparent)'
    case 'STALE': return 'color-mix(in srgb, var(--color-bad) 10%, transparent)'
    default: return 'var(--color-panel-2)'
  }
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabId = 'ALL' | 'UNMATCHED' | 'SUGGESTED' | 'MATCHED' | 'STALE'

const TABS: { id: TabId; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'UNMATCHED', label: 'Unmatched' },
  { id: 'SUGGESTED', label: 'Suggested' },
  { id: 'MATCHED', label: 'Matched' },
  { id: 'STALE', label: 'Stale' },
]

function countForTab(receipts: ReceiptItem[], tabId: TabId): number {
  if (tabId === 'ALL') return receipts.length
  return receipts.filter((r) => r.matchStatus === tabId).length
}

function filterReceipts(receipts: ReceiptItem[], tabId: TabId): ReceiptItem[] {
  if (tabId === 'ALL') return receipts
  return receipts.filter((r) => r.matchStatus === tabId)
}

// ─── Receipt Card ─────────────────────────────────────────────────────────────

function ReceiptCard({
  receipt,
  onClick,
}: {
  receipt: ReceiptItem
  onClick: () => void
}) {
  const bg = thumbnailBg(receipt.matchStatus)
  const iconColor =
    receipt.matchStatus === 'MATCHED' ? 'var(--color-ok)' : 'var(--color-ink-3)'

  return (
    <div
      onClick={onClick}
      className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] cursor-pointer transition-colors hover:bg-[var(--color-panel-2)] overflow-hidden"
    >
      {/* Thumbnail area */}
      <div
        className="flex items-center justify-center"
        style={{ height: 160, background: bg }}
      >
        <Receipt style={{ width: 32, height: 32, color: iconColor }} />
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1">
        {receipt.hintSupplier ? (
          <p
            className="text-[14px] font-medium truncate"
            style={{ color: 'var(--color-ink)' }}
          >
            {receipt.hintSupplier}
          </p>
        ) : (
          <p
            className="text-[14px] font-medium truncate italic"
            style={{ color: 'var(--color-ink-3)' }}
          >
            Unknown
          </p>
        )}

        <p
          className="text-[12px] font-mono truncate"
          style={{ color: 'var(--color-ink-2)' }}
        >
          {receipt.hintDate ?? '—'}
          {receipt.hintAmountCents != null
            ? ` · R ${(receipt.hintAmountCents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
            : ''}
        </p>

        <p
          className="text-[11px] font-mono truncate"
          style={{ color: 'var(--color-ink-4)' }}
        >
          {receipt.fileName}
        </p>

        <StatusPillFromStatus status={receiptStatusToPill(receipt.matchStatus)} />
      </div>
    </div>
  )
}

// ─── RcptDrawer ───────────────────────────────────────────────────────────────

function RcptDrawer({
  receipt,
  onClose,
  onMatch,
}: {
  receipt: ReceiptItem | null
  onClose: () => void
  onMatch: (receiptId: string, txId: string) => void
}) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)

  useEffect(() => {
    if (!receipt) {
      setCandidates([])
      setSelectedTxId(null)
      return
    }
    let cancelled = false
    const controller = new AbortController()
    setLoading(true)
    setCandidates([])
    setSelectedTxId(null)
    fetch(`/api/receipts/${receipt.id}/candidates`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { candidates: [] }))
      .then((body: { candidates?: unknown }) => {
        if (cancelled) return
        const valid = Array.isArray(body.candidates)
          ? (body.candidates as unknown[]).filter(
              (c): c is Candidate =>
                c != null &&
                typeof c === 'object' &&
                'transaction' in c &&
                'confidence' in c
            )
          : []
        setCandidates(valid)
        setSelectedTxId(valid[0]?.transaction.id ?? null)
      })
      .catch(() => { if (!cancelled) setCandidates([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; controller.abort() }
  }, [receipt?.id])

  if (!receipt) return null

  const drawerTitle = receipt.hintSupplier ?? 'Unknown supplier'
  const drawerDescription = `Captured ${new Date(receipt.capturedAt).toLocaleDateString('en-ZA')} · ${receipt.matchStatus}`

  return (
    <Drawer
      open={receipt !== null}
      onClose={onClose}
      width={880}
      title={drawerTitle}
      description={drawerDescription}
      footer={
        <>
          <button
            className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-[13px] font-medium transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--color-bad)', color: 'var(--color-bad)' }}
            disabled
          >
            Reject receipt
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--color-panel-2)]"
              style={{ color: 'var(--color-ink-2)' }}
            >
              Skip
            </button>
            {selectedTxId && (
              <button
                onClick={() => receipt && onMatch(receipt.id, selectedTxId)}
                className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                Confirm match
              </button>
            )}
          </div>
        </>
      }
    >
      <div className="flex gap-5 h-full min-h-0">
        {/* Left pane: Receipt */}
        <div className="w-[280px] shrink-0 flex flex-col">
          <p
            className="text-[10.5px] font-semibold uppercase tracking-[.06em] mb-3"
            style={{ color: 'var(--color-ink-3)' }}
          >
            Receipt
          </p>
          <div
            className="rounded-[10px] border p-4 flex-1 flex flex-col gap-2"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-panel-2)',
            }}
          >
            {receipt.hintSupplier ? (
              <p
                className="text-[15px] font-semibold"
                style={{ color: 'var(--color-ink)' }}
              >
                {receipt.hintSupplier}
              </p>
            ) : (
              <p
                className="text-[15px] font-semibold italic"
                style={{ color: 'var(--color-ink-3)' }}
              >
                Unknown supplier
              </p>
            )}

            <p
              className="text-[11.5px] font-mono"
              style={{ color: 'var(--color-ink-3)' }}
            >
              {receipt.hintDate ?? '—'} · Captured{' '}
              {new Date(receipt.capturedAt).toLocaleDateString('en-ZA')}
            </p>

            <div
              className="border-t my-2"
              style={{ borderColor: 'var(--color-border)' }}
            />

            <div className="flex items-center justify-between">
              <span
                className="text-[13px] font-semibold"
                style={{ color: 'var(--color-ink)' }}
              >
                TOTAL
              </span>
              <span
                className="text-[15px] font-bold font-mono tabular-nums"
                style={{ color: 'var(--color-ink)' }}
              >
                {receipt.hintAmountCents != null
                  ? `R ${(receipt.hintAmountCents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
                  : '—'}
              </span>
            </div>

            <div
              className="mt-auto pt-3 border-t"
              style={{ borderColor: 'var(--color-border-2)' }}
            >
              <p
                className="text-[11px] font-mono"
                style={{ color: 'var(--color-ink-4)' }}
              >
                {receipt.fileName}
              </p>
              <p
                className="text-[11px] font-mono"
                style={{ color: 'var(--color-ink-4)' }}
              >
                {receipt.uploaderPhone}
              </p>
            </div>
          </div>
        </div>

        {/* Right pane: Candidate transactions */}
        <div className="flex-1 min-w-0 flex flex-col">
          <p
            className="text-[10.5px] font-semibold uppercase tracking-[.06em] mb-3"
            style={{ color: 'var(--color-ink-3)' }}
          >
            Candidate transactions
          </p>

          {loading ? (
            <p
              className="text-[13px] py-8 text-center"
              style={{ color: 'var(--color-ink-3)' }}
            >
              Loading candidates…
            </p>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <p
                className="text-[13px] font-medium"
                style={{ color: 'var(--color-ink)' }}
              >
                No likely matches
              </p>
              <p
                className="text-[12px]"
                style={{ color: 'var(--color-ink-3)' }}
              >
                Try a different period or upload a corrected receipt.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map(({ transaction: tx, confidence: conf }) => {
                const confPct = Math.round(conf * 100)
                const confColor =
                  conf > 0.8
                    ? 'var(--color-ok)'
                    : conf > 0.5
                    ? 'var(--color-warn)'
                    : 'var(--color-neg)'
                const isSelected = tx.id === selectedTxId

                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTxId(tx.id)}
                    className="flex items-center gap-3 rounded-[8px] border p-3 cursor-pointer transition-colors hover:bg-[var(--color-panel-2)]"
                    style={{
                      borderColor: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                      backgroundColor: isSelected
                        ? 'color-mix(in srgb, var(--color-accent) 5%, transparent)'
                        : undefined,
                    }}
                  >
                    <span
                      className="shrink-0 text-[12px] font-bold font-mono w-9 text-center tabular-nums"
                      style={{ color: confColor }}
                    >
                      {confPct}%
                    </span>

                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-medium truncate"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {tx.rawDescription}
                      </p>
                      <p
                        className="text-[11.5px] font-mono tabular-nums"
                        style={{ color: 'var(--color-ink-3)' }}
                      >
                        {tx.transactionDate}
                      </p>
                    </div>

                    <p
                      className="shrink-0 text-[13px] font-medium font-mono tabular-nums"
                      style={{
                        color:
                          tx.direction === 'DEBIT'
                            ? 'var(--color-neg)'
                            : 'var(--color-pos)',
                      }}
                    >
                      {tx.direction === 'DEBIT' ? '-' : '+'}R{' '}
                      {(Math.abs(tx.amountCents) / 100).toLocaleString('en-ZA', {
                        minimumFractionDigits: 2,
                      })}
                    </p>

                    <button
                      onClick={() => receipt && onMatch(receipt.id, tx.id)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-[var(--color-panel-2)]"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-ink-2)',
                      }}
                    >
                      Match
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  )
}

// ─── Main client component ────────────────────────────────────────────────────

export function ReceiptsClient({
  receipts: initialReceipts,
}: {
  receipts: ReceiptItem[]
}) {
  const { toast } = useToast()
  const [receipts, setReceipts] = useState<ReceiptItem[]>(initialReceipts)
  const [activeTab, setActiveTab] = useState<TabId>('ALL')
  const [activeReceipt, setActiveReceipt] = useState<ReceiptItem | null>(null)

  useEffect(() => {
    setReceipts(initialReceipts)
  }, [initialReceipts])

  const visibleReceipts = filterReceipts(receipts, activeTab)
  const activeTabLabel = TABS.find((t) => t.id === activeTab)?.label ?? 'All'

  async function handleMatch(receiptId: string, txId: string) {
    try {
      const res = await fetch(`/api/receipts/${receiptId}/match`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // Optimistic update
      setReceipts((prev) =>
        prev.map((r) =>
          r.id === receiptId ? { ...r, matchStatus: 'MATCHED' } : r
        )
      )
      setActiveReceipt(null)
      toast('Receipt matched successfully')
    } catch {
      toast('Failed to match receipt. Please try again.')
    }
  }

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="text-[26px] font-semibold tracking-[-0.02em]"
            style={{ color: 'var(--color-ink)' }}
          >
            Receipt inbox
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
            {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} · captured via WhatsApp upload
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Upload receipt
        </button>
      </div>

      {/* Card: tabs + grid */}
      <div
        className="rounded-[10px] border"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-panel)',
        }}
      >
        {/* Tab row */}
        <div
          className="flex items-center border-b px-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const count = countForTab(receipts, tab.id)
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-3 text-[13px] font-medium relative transition-colors',
                  isActive
                    ? 'text-[var(--color-ink)]'
                    : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]'
                )}
              >
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  />
                )}
                {tab.label}
                <span
                  className="text-[11px] font-mono px-1.5 py-px rounded-full"
                  style={{
                    backgroundColor: isActive
                      ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                      : 'var(--color-panel-2)',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-ink-3)',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Receipt grid or empty state */}
        {visibleReceipts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Receipt
              className="h-10 w-10"
              style={{ color: 'var(--color-ink-3)' }}
            />
            <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
              No receipts in &ldquo;{activeTabLabel}&rdquo;
            </p>
            <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
              Receipts get auto-matched when a supplier and amount line up within 7 days.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
            {visibleReceipts.map((r) => (
              <ReceiptCard
                key={r.id}
                receipt={r}
                onClick={() => setActiveReceipt(r)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <RcptDrawer
        receipt={activeReceipt}
        onClose={() => setActiveReceipt(null)}
        onMatch={handleMatch}
      />
    </div>
  )
}
