'use client'
import { useState, useEffect } from 'react'
import { Drawer } from '@/components/ui/drawer'
import { InlineCategoryPicker, type Category } from '@/components/ui/inline-category-picker'
import { StatusPillFromStatus } from '@/components/ui/status-pill'
import { updateTransactionAction } from './actions'
import { useToast } from '@/lib/use-toast'

type Transaction = {
  id: string
  transactionDate: string
  rawDescription: string
  amountCents: number
  reviewStatus: string
  direction: string
  category: { id: string; name: string; color?: string } | null
  supplier?: { id: string; name: string } | null
  receipt?: string | null
}

type AuditEvent = {
  id: string
  action: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  createdAt: string
  actor: { name: string; email: string } | null
}

interface TxDrawerProps {
  tx: Transaction | null
  categories: Category[]
  onClose: () => void
  onUpdate: (id: string, data: { reviewStatus?: string; categoryId?: string }) => void
}

export function TxDrawer({ tx, categories, onClose, onUpdate }: TxDrawerProps) {
  const { toast } = useToast()
  const [isPending, setIsPending] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'audit'>('details')
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  const isExpense = tx?.direction === 'DEBIT'
  const amount = tx ? (Math.abs(tx.amountCents) / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '0.00'

  useEffect(() => {
    if (activeTab !== 'audit' || !tx) return
    setAuditLoading(true)
    fetch(`/api/transactions/${tx.id}/audit`, { credentials: 'include' })
      .then(r => r.json())
      .then((data: { data: AuditEvent[] }) => {
        setAuditEvents(data.data ?? [])
        setAuditLoading(false)
      })
      .catch(() => setAuditLoading(false))
  }, [activeTab, tx?.id])

  // Reset to details tab when a new transaction is opened
  useEffect(() => {
    setActiveTab('details')
    setAuditEvents([])
  }, [tx?.id])

  const handleApprove = async () => {
    if (!tx || isPending) return
    setIsPending(true)
    const result = await updateTransactionAction(tx.id, { reviewStatus: 'REVIEWED' })
    setIsPending(false)
    if (result.ok) {
      onUpdate(tx.id, { reviewStatus: 'REVIEWED' })
      toast('Transaction marked reviewed')
      onClose()
    } else {
      toast('Failed to approve. Please try again.')
    }
  }

  const handleUnclear = async () => {
    if (!tx || isPending) return
    setIsPending(true)
    const result = await updateTransactionAction(tx.id, { reviewStatus: 'UNCLEAR' })
    setIsPending(false)
    if (result.ok) {
      onUpdate(tx.id, { reviewStatus: 'UNCLEAR' })
      toast('Transaction marked unclear')
      onClose()
    } else {
      toast('Failed to mark unclear. Please try again.')
    }
  }

  const handleCategoryChange = async (categoryId: string) => {
    if (!tx || isPending) return
    setIsPending(true)
    const result = await updateTransactionAction(tx.id, { categoryId })
    setIsPending(false)
    if (result.ok) {
      onUpdate(tx.id, { categoryId })
      toast('Category updated')
    } else {
      toast('Failed to update category. Please try again.')
    }
  }

  const date = tx ? new Date(tx.transactionDate).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) : ''

  const tabButtonClass = 'rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors'

  return (
    <Drawer
      open={tx !== null}
      onClose={onClose}
      title={tx?.rawDescription ?? ''}
      description={date}
      footer={
        tx?.reviewStatus !== 'LOCKED' ? (
          <>
            <button
              onClick={handleUnclear}
              disabled={isPending || tx?.reviewStatus === 'REVIEWED'}
              className="rounded-md px-4 py-2 text-[13px] font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-panel-2)] transition-colors disabled:opacity-50"
            >
              Mark unclear
            </button>
            <button
              onClick={handleApprove}
              disabled={isPending || tx?.reviewStatus === 'REVIEWED'}
              className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Approve'}
            </button>
          </>
        ) : (
          <span className="text-[12.5px] text-[var(--color-ink-3)]">This period is locked</span>
        )
      }
    >
      {tx && (
        <div>
          {/* Tab bar */}
          <div
            className="flex gap-1 border-b px-4 pb-2 pt-1"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={() => setActiveTab('details')}
              className={tabButtonClass}
              style={
                activeTab === 'details'
                  ? {
                      backgroundColor: 'color-mix(in srgb,var(--color-accent) 12%,transparent)',
                      color: 'var(--color-accent)',
                    }
                  : { color: 'var(--color-ink-2)' }
              }
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={tabButtonClass}
              style={
                activeTab === 'audit'
                  ? {
                      backgroundColor: 'color-mix(in srgb,var(--color-accent) 12%,transparent)',
                      color: 'var(--color-accent)',
                    }
                  : { color: 'var(--color-ink-2)' }
              }
            >
              Audit
            </button>
          </div>

          {/* Details tab */}
          {activeTab === 'details' && (
            <div className="space-y-5 p-4">
              {/* Amount */}
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[.04em] text-[var(--color-ink-3)]">Amount</p>
                <p
                  className="mt-1 text-[28px] font-semibold tracking-[-0.02em] tabular-nums"
                  style={{ color: isExpense ? 'var(--color-neg)' : 'var(--color-pos)' }}
                >
                  {isExpense ? '−' : '+'}R {amount}
                </p>
              </div>

              {/* Status */}
              <div>
                <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[.04em] text-[var(--color-ink-3)]">Status</p>
                <StatusPillFromStatus status={tx.reviewStatus} />
              </div>

              {/* Category */}
              <div>
                <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[.04em] text-[var(--color-ink-3)]">Category</p>
                <InlineCategoryPicker
                  value={tx.category?.id ?? null}
                  onChange={handleCategoryChange}
                  categories={categories}
                />
              </div>

              {/* Supplier */}
              <div>
                <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[.04em] text-[var(--color-ink-3)]">Supplier</p>
                <p className="text-[13px] text-[var(--color-ink)]">
                  {tx.supplier?.name ?? <span className="text-[var(--color-ink-3)]">—</span>}
                </p>
              </div>

              {/* Receipt */}
              <div>
                <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[.04em] text-[var(--color-ink-3)]">Receipt</p>
                <p className="text-[13px]" style={{ color: tx.receipt ? 'var(--color-ok)' : 'var(--color-ink-3)' }}>
                  {tx.receipt ? 'Linked' : 'Not linked'}
                </p>
              </div>
            </div>
          )}

          {/* Audit tab */}
          {activeTab === 'audit' && (
            <div className="space-y-3 p-4">
              {auditLoading ? (
                <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>Loading…</p>
              ) : auditEvents.length === 0 ? (
                <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
                  No changes recorded yet
                </p>
              ) : (
                auditEvents.map(event => (
                  <div
                    key={event.id}
                    className="rounded-[8px] border p-3"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-panel-2)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[.05em]"
                        style={{
                          backgroundColor: 'color-mix(in srgb,var(--color-accent) 12%,transparent)',
                          color: 'var(--color-accent)',
                        }}
                      >
                        {event.action}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
                        {new Date(event.createdAt).toLocaleString('en-ZA', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {event.actor && (
                      <p className="mt-1 text-[12px]" style={{ color: 'var(--color-ink-2)' }}>
                        by {event.actor.name}
                      </p>
                    )}
                    {event.after && Object.keys(event.after).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(event.after).map(([key, val]) => {
                          const prev = (event.before as Record<string, unknown> | null)?.[key]
                          if (val === prev) return null
                          return (
                            <div key={key} className="flex items-start gap-2 text-[12px]">
                              <span style={{ color: 'var(--color-ink-3)' }}>{key}:</span>
                              {prev !== undefined && prev !== null && (
                                <>
                                  <span
                                    className="line-through"
                                    style={{ color: 'var(--color-bad)' }}
                                  >
                                    {String(prev)}
                                  </span>
                                  <span style={{ color: 'var(--color-ink-3)' }}>→</span>
                                </>
                              )}
                              <span style={{ color: 'var(--color-ok)' }}>
                                {val === null || val === undefined ? '—' : String(val)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}
