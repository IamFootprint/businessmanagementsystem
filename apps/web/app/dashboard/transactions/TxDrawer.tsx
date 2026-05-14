'use client'
import { useState } from 'react'
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

interface TxDrawerProps {
  tx: Transaction | null
  categories: Category[]
  onClose: () => void
  onUpdate: (id: string, data: { reviewStatus?: string; categoryId?: string }) => void
}

export function TxDrawer({ tx, categories, onClose, onUpdate }: TxDrawerProps) {
  const { toast } = useToast()
  const [isPending, setIsPending] = useState(false)

  const isExpense = tx?.direction === 'DEBIT'
  const amount = tx ? (Math.abs(tx.amountCents) / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '0.00'

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
        <div className="space-y-5">
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
    </Drawer>
  )
}
