'use client'
import { useEffect, useState } from 'react'
import { X, Paperclip } from 'lucide-react'
import { createManualTransactionAction } from './actions'
import type { Category } from '@/components/ui/inline-category-picker'

type Business = { id: string; name: string; slug: string }
type Supplier = { id: string; name: string }

type Props = {
  open: boolean
  onClose: () => void
  onCreated: () => void
  categories: Category[]
  businesses: Business[]
  suppliers: Supplier[]
}

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'EXPENSE',    label: 'Expense (cash out)' },
  { value: 'REVENUE',    label: 'Cash sale / receipt' },
  { value: 'OWNER_DRAW', label: 'Owner top-up (cash in)' },
  { value: 'TRANSFER',   label: 'Transfer' },
]

export function CashExpenseModal({ open, onClose, onCreated, categories, businesses, suppliers }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionType, setTransactionType] = useState('EXPENSE')
  const [categoryId, setCategoryId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      // Reset to defaults each time the modal opens.
      setDate(today)
      setDescription('')
      setAmount('')
      setTransactionType('EXPENSE')
      setCategoryId('')
      setSupplierId('')
      setBusinessId('')
      setNotes('')
      setFile(null)
      setError(null)
      setSubmitting(false)
    }
  }, [open, today])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const form = new FormData()
    form.set('date', date)
    form.set('description', description)
    form.set('amount', amount)
    form.set('transactionType', transactionType)
    if (categoryId) form.set('categoryId', categoryId)
    if (supplierId) form.set('supplierId', supplierId)
    if (businessId) form.set('businessId', businessId)
    if (notes) form.set('notes', notes)
    if (file) form.set('file', file)

    const result = await createManualTransactionAction(form)
    if (!result.ok) {
      setError(result.error ?? 'Failed to record transaction')
      setSubmitting(false)
      return
    }
    onCreated()
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <div>
            <h2 className="text-[17px] font-semibold text-[var(--color-ink)]">Add cash expense</h2>
            <p className="mt-0.5 text-[12px] text-[var(--color-ink-3)]">Records to the Petty Cash account.</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-ink-3)] hover:bg-[var(--color-panel-2)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" htmlFor="me-date">
              <input
                id="me-date" type="date" value={date} required
                onChange={(e) => setDate(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
              />
            </Field>
            <Field label="Amount (R)" htmlFor="me-amount">
              <input
                id="me-amount" type="number" min="0" step="0.01" value={amount} required placeholder="850.00"
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] tabular-nums outline-none focus:border-[var(--color-accent)]"
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="me-desc">
            <input
              id="me-desc" type="text" value={description} required placeholder="e.g. TB MACHINES — toner cartridge"
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" htmlFor="me-type">
              <select
                id="me-type" value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
              >
                {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Business" htmlFor="me-business">
              <select
                id="me-business" value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
              >
                <option value="">— Auto from rule —</option>
                {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" htmlFor="me-cat">
              <select
                id="me-cat" value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
              >
                <option value="">— Auto from rule —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Supplier" htmlFor="me-sup">
              <select
                id="me-sup" value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
              >
                <option value="">— Auto from rule —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Notes" htmlFor="me-notes">
            <textarea
              id="me-notes" value={notes} rows={2} placeholder="Optional"
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </Field>

          <Field label="Receipt photo (optional)" htmlFor="me-file">
            <label
              htmlFor="me-file"
              className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 text-[13px] text-[var(--color-ink-2)] hover:border-[var(--color-accent)]"
            >
              <Paperclip className="h-3.5 w-3.5" />
              {file ? file.name : 'Attach photo / PDF (≤10 MB)'}
            </label>
            <input
              id="me-file" type="file" className="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-[var(--color-bad)] bg-[var(--color-bad-bg)] px-3 py-2 text-[12.5px]"
              style={{ color: 'var(--color-bad)' }}
            >
              {error}
            </div>
          )}

          <footer className="mt-1 flex items-center justify-end gap-2">
            <button
              type="button" onClick={onClose}
              className="h-9 rounded-md border border-[var(--color-border)] px-3 text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-panel-2)]"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              className="h-9 rounded-md px-4 text-[13px] font-semibold text-white disabled:opacity-60"
              style={{ background: 'var(--color-primary)' }}
            >
              {submitting ? 'Saving…' : 'Record expense'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={htmlFor} className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--color-ink-3)]">
        {label}
      </label>
      {children}
    </div>
  )
}
