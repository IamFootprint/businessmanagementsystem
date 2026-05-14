'use client'
import { useState, useEffect, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/use-toast'
import { Receipt as ReceiptIcon } from 'lucide-react'
import { TabsWithCount } from '@/components/ui/tabs-with-count'
import { BulkActionBar } from '@/components/ui/bulk-action-bar'
import { ThreeStateCheckbox } from '@/components/ui/three-state-checkbox'
import { InlineCategoryPicker, type Category } from '@/components/ui/inline-category-picker'
import { cn } from '@/lib/utils'
import { updateTransactionAction, bulkUpdateTransactionsAction } from './actions'
import { TxDrawer } from './TxDrawer'

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
  confidence?: number
}

interface TransactionsClientProps {
  transactions: Transaction[]
  meta: { total: number; page: number; pageSize: number; pages: number }
  categories: Category[]
  reviewStatus: string
  page: number
}

const STATUS_TABS = [
  { id: 'NEEDS_REVIEW', label: 'Needs review' },
  { id: 'REVIEWED',     label: 'Reviewed' },
  { id: 'UNCLEAR',      label: 'Unclear' },
  { id: 'LOCKED',       label: 'Locked' },
]

export function TransactionsClient({ transactions, meta, categories, reviewStatus, page }: TransactionsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [localTx, setLocalTx] = useState(transactions)
  const [drawerTxId, setDrawerTxId] = useState<string | null>(null)

  // C1: re-sync when server re-fetches (tab switch or router refresh)
  useEffect(() => {
    setLocalTx(transactions)
    setSelected(new Set())
  }, [transactions])

  const drawerTx = localTx.find(t => t.id === drawerTxId) ?? null

  // Selection logic
  const allSelected = localTx.length > 0 && selected.size === localTx.length
  const someSelected = selected.size > 0 && selected.size < localTx.length
  const headerChecked: boolean | 'indeterminate' = allSelected ? true : someSelected ? 'indeterminate' : false

  const toggleAll = (v: boolean) => setSelected(v ? new Set(localTx.map(t => t.id)) : new Set())
  const toggleRow = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // Category update (inline picker)
  // C2: capture original via functional updater (avoids stale closure over localTx)
  const handleCategoryChange = useCallback(async (txId: string, categoryId: string) => {
    let original: Transaction | undefined
    setLocalTx(prev => {
      original = prev.find(t => t.id === txId)
      return prev.map(t => {
        if (t.id !== txId) return t
        const cat = categories.find(c => c.id === categoryId)
        return { ...t, category: cat ? { id: cat.id, name: cat.name, color: cat.color } : t.category }
      })
    })
    const result = await updateTransactionAction(txId, { categoryId })
    if (!result.ok && original) {
      setLocalTx(prev => prev.map(t => t.id === txId ? original! : t))
    }
  }, [categories])

  // Bulk approve
  const handleBulkApprove = async () => {
    const ids = Array.from(selected)
    const originals = localTx.filter(t => ids.includes(t.id))
    setLocalTx(prev => prev.map(t => ids.includes(t.id) ? { ...t, reviewStatus: 'REVIEWED' } : t))
    setSelected(new Set())
    const result = await bulkUpdateTransactionsAction(ids, { reviewStatus: 'REVIEWED' })
    if (result.ok) {
      toast(`${ids.length} transaction${ids.length !== 1 ? 's' : ''} marked reviewed`)
    } else {
      // Revert
      setLocalTx(prev => prev.map(t => {
        const orig = originals.find(o => o.id === t.id)
        return orig ?? t
      }))
      toast('Bulk approve failed. Please try again.')
    }
  }

  const formatAmount = (cents: number) =>
    `R ${(Math.abs(cents) / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`

  const tabs = STATUS_TABS.map(t => ({
    ...t,
    count: t.id === reviewStatus ? meta.total : undefined,
  }))

  return (
    <div className="flex flex-col gap-0 px-[var(--page-gutter)] py-6">
      {/* Page head */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">Transactions</h1>
          <p className="mt-0.5 text-[13px] text-[var(--color-ink-3)]">{meta.total} transactions · Standard Bank Main</p>
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)]">
        {/* Tab row */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pr-4">
          <TabsWithCount
            tabs={tabs}
            activeTab={reviewStatus}
            onTabChange={id => {
              startTransition(() => router.push(`/dashboard/transactions?reviewStatus=${id}`))
            }}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-panel-2)]">
                <th scope="col" className="w-10 px-3 py-2.5">
                  <ThreeStateCheckbox
                    checked={headerChecked}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th scope="col" className="px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[.06em] text-[var(--color-ink-3)] w-[110px]">Date</th>
                <th scope="col" className="px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[.06em] text-[var(--color-ink-3)]">Description</th>
                <th scope="col" className="px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[.06em] text-[var(--color-ink-3)]">Category</th>
                <th scope="col" className="px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[.06em] text-[var(--color-ink-3)] w-[130px]">Supplier</th>
                <th scope="col" className="px-3 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[.06em] text-[var(--color-ink-3)] w-[140px]">Amount</th>
                <th scope="col" className="px-3 py-2.5 w-16 text-center text-[10.5px] font-semibold uppercase tracking-[.06em] text-[var(--color-ink-3)]">Rcpt</th>
              </tr>
            </thead>
            <tbody>
              {localTx.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[13px] text-[var(--color-ink-3)]">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                localTx.map(tx => {
                  const isSelected = selected.has(tx.id)
                  const date = new Date(tx.transactionDate)
                  const formatted = date.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  const isExpense = tx.direction === 'DEBIT'
                  const lowConf = tx.confidence != null && tx.confidence < 0.8 && tx.confidence > 0

                  return (
                    <tr
                      key={tx.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        'border-b border-[var(--color-border-2)] cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-[color-mix(in_srgb,var(--color-accent)_7%,white)]'
                          : 'hover:bg-[var(--color-panel-2)]'
                      )}
                      onClick={e => {
                        const target = e.target as HTMLElement
                        if (target.closest('input[type="checkbox"]') || target.closest('button') || target.closest('[data-no-row-click]')) return
                        setDrawerTxId(tx.id)
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setDrawerTxId(tx.id)
                        }
                      }}
                    >
                      <td className="px-3 py-0 w-10" onClick={e => e.stopPropagation()}>
                        <ThreeStateCheckbox
                          checked={isSelected}
                          onChange={() => toggleRow(tx.id)}
                          aria-label={`Select ${tx.rawDescription}`}
                        />
                      </td>
                      <td className="px-3 py-3 tabular-nums text-[var(--color-ink-2)] whitespace-nowrap">{formatted}</td>
                      <td className="px-3 py-3 max-w-[280px]">
                        <p className="truncate font-medium text-[var(--color-ink)]">{tx.rawDescription}</p>
                        {lowConf && (
                          <p className="text-[11.5px] text-[var(--color-warn)]">✦ Low confidence ({Math.round((tx.confidence ?? 0) * 100)}%)</p>
                        )}
                      </td>
                      <td className="px-3 py-3" data-no-row-click>
                        {reviewStatus === 'LOCKED' ? (
                          tx.category ? (
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tx.category.color ?? 'var(--color-ink-3)' }} />
                              <span className="text-[13px] text-[var(--color-ink)]">{tx.category.name}</span>
                            </div>
                          ) : <span className="text-[var(--color-ink-3)]">—</span>
                        ) : (
                          <InlineCategoryPicker
                            value={tx.category?.id ?? null}
                            onChange={catId => handleCategoryChange(tx.id, catId)}
                            categories={categories}
                          />
                        )}
                      </td>
                      <td className="px-3 py-3 text-[var(--color-ink-2)]">
                        {tx.supplier?.name ?? '—'}
                      </td>
                      <td className={cn('px-3 py-3 text-right tabular-nums font-medium', isExpense ? 'text-[var(--color-neg)]' : 'text-[var(--color-pos)]')}>
                        {isExpense ? '−' : '+'}{formatAmount(tx.amountCents)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ReceiptIcon
                          className="mx-auto h-4 w-4"
                          style={{ color: tx.receipt ? 'var(--color-ok)' : 'var(--color-ink-4)' }}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 text-[12.5px] text-[var(--color-ink-3)]">
            <span>Page {meta.page} of {meta.pages}</span>
            <div className="flex gap-2">
              {meta.page > 1 && (
                <button
                  onClick={() => startTransition(() => router.push(`/dashboard/transactions?reviewStatus=${reviewStatus}&page=${meta.page - 1}`))}
                  className="rounded-md border border-[var(--color-border)] px-3 py-1 text-[12.5px] hover:bg-[var(--color-panel-2)]"
                >
                  ← Prev
                </button>
              )}
              {meta.page < meta.pages && (
                <button
                  onClick={() => startTransition(() => router.push(`/dashboard/transactions?reviewStatus=${reviewStatus}&page=${meta.page + 1}`))}
                  className="rounded-md border border-[var(--color-border)] px-3 py-1 text-[12.5px] hover:bg-[var(--color-panel-2)]"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          onApprove={handleBulkApprove}
          onSetCategory={() => {}}
          onClose={() => setSelected(new Set())}
        />
      )}

      {/* Transaction drawer */}
      <TxDrawer
        tx={drawerTx}
        categories={categories}
        onClose={() => setDrawerTxId(null)}
        onUpdate={(txId, data) => {
          setLocalTx(prev => prev.map(t => {
            if (t.id !== txId) return t
            const updatedCat = data.categoryId
              ? (() => {
                  const found = categories.find(c => c.id === data.categoryId)
                  return found ? { id: found.id, name: found.name, color: found.color } : t.category
                })()
              : t.category
            return {
              ...t,
              reviewStatus: data.reviewStatus ?? t.reviewStatus,
              category: updatedCat,
            }
          }))
        }}
      />
    </div>
  )
}
