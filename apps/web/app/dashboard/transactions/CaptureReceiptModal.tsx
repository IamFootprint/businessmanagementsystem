'use client'
import { useState, useRef } from 'react'
import { X, Camera, Loader2, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react'
import { captureReceiptAction, createManualTransactionAction } from './actions'
import type { Category } from '@/components/ui/inline-category-picker'

type Business = { id: string; name: string; slug: string }
type Supplier = { id: string; name: string }

type Phase = 'pick' | 'uploading' | 'review' | 'saving' | 'done'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: () => void
  categories: Category[]
  businesses: Business[]
  suppliers: Supplier[]
}

export function CaptureReceiptModal({ open, onClose, onCreated, categories, businesses }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('pick')
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [capture, setCapture] = useState<Awaited<ReturnType<typeof captureReceiptAction>> | null>(null)

  // Editable review fields
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes] = useState('')

  if (!open) return null

  const reset = () => {
    setCapture(null)
    setPreviewUrl(null)
    setError(null)
    setPhase('pick')
  }

  const handleFile = async (file: File) => {
    setError(null)
    setPreviewUrl(URL.createObjectURL(file))
    setPhase('uploading')

    const fd = new FormData()
    fd.set('file', file)
    const result = await captureReceiptAction(fd)
    if (!result.ok) {
      setError(result.error ?? 'Capture failed')
      setPhase('pick')
      return
    }
    setCapture(result)
    setDate(result.ocr?.transactionDate ?? new Date().toISOString().slice(0, 10))
    setAmount(result.ocr?.totalAmount != null ? String(result.ocr.totalAmount.toFixed(2)) : '')
    setDescription(result.ocr?.merchant ?? '')
    setBusinessId(result.suggestion?.businessId ?? '')
    setCategoryId(result.suggestion?.categoryId ?? '')
    setNotes('')
    setPhase('review')
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!capture?.receipt) return
    setError(null)
    setPhase('saving')

    const fd = new FormData()
    fd.set('date', date)
    fd.set('description', description)
    fd.set('amount', amount)
    fd.set('transactionType', 'EXPENSE')
    fd.set('receiptId', capture.receipt.id)
    if (businessId) fd.set('businessId', businessId)
    if (categoryId) fd.set('categoryId', categoryId)
    if (capture.suggestion?.supplierId) fd.set('supplierId', capture.suggestion.supplierId)
    if (notes) fd.set('notes', notes)

    const result = await createManualTransactionAction(fd)
    if (!result.ok) {
      setError(result.error ?? 'Save failed')
      setPhase('review')
      return
    }
    setPhase('done')
    onCreated()
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
            <h2 className="text-[17px] font-semibold text-[var(--color-ink)]">Capture receipt</h2>
            <p className="mt-0.5 text-[12px] text-[var(--color-ink-3)]">Photo → OCR → review → save</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-[var(--color-ink-3)] hover:bg-[var(--color-panel-2)]">
            <X className="h-4 w-4" />
          </button>
        </header>

        {phase === 'pick' && (
          <div className="grid gap-3 p-5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl px-5 py-12 flex flex-col items-center gap-2 transition-colors hover:bg-[var(--color-panel-2)]"
              style={{ background: 'var(--color-panel)', border: '2px dashed var(--color-border-2)', color: 'var(--color-ink-2)' }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--color-accent)', color: 'white' }}>
                <Camera size={22} />
              </div>
              <span className="text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>Select photo or take one</span>
              <span className="text-[11px] text-[var(--color-ink-3)]">JPEG / PNG, up to 10 MB</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            {error && <InlineError text={error} />}
          </div>
        )}

        {phase === 'uploading' && (
          <div className="flex flex-col items-center gap-3 px-5 py-10">
            {previewUrl && (
              <img src={previewUrl} alt="" className="max-h-48 rounded-lg" style={{ border: '1px solid var(--color-border)' }} />
            )}
            <div className="flex items-center gap-2 text-[13px] text-[var(--color-ink-2)]">
              <Loader2 size={14} className="animate-spin" />
              Reading the receipt…
            </div>
          </div>
        )}

        {(phase === 'review' || phase === 'saving') && (
          <form onSubmit={handleConfirm} className="grid gap-3 p-5">
            <div className="flex items-center justify-between">
              <button type="button" onClick={reset} className="flex items-center gap-1 text-[12px] text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]">
                <RotateCcw size={12} />
                Re-take
              </button>
              <ConfidenceBadge confidence={capture?.ocr?.confidence ?? 'low'} />
            </div>

            {previewUrl && (
              <img src={previewUrl} alt="" className="max-h-32 self-center rounded-lg" style={{ border: '1px solid var(--color-border)' }} />
            )}

            {capture?.suggestion?.supplierMatch && (
              <div
                className="rounded-md px-2.5 py-1.5 text-[12px] flex items-center gap-2"
                style={{ background: 'var(--color-ok-bg)', color: 'var(--color-ok)' }}
              >
                <CheckCircle2 size={12} />
                Matched: <span className="font-semibold">{capture.suggestion.supplierMatch.name}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" htmlFor="cap-date">
                <input id="cap-date" type="date" value={date} required onChange={(e) => setDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]" />
              </Field>
              <Field label="Amount (R)" htmlFor="cap-amount">
                <input id="cap-amount" type="number" min="0" step="0.01" value={amount} required onChange={(e) => setAmount(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] tabular-nums outline-none focus:border-[var(--color-accent)]" />
              </Field>
            </div>

            <Field label="Merchant / description" htmlFor="cap-desc">
              <input id="cap-desc" type="text" value={description} required onChange={(e) => setDescription(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Business" htmlFor="cap-biz">
                <select id="cap-biz" value={businessId} required onChange={(e) => setBusinessId(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]">
                  <option value="">— Select —</option>
                  {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
              <Field label="Category" htmlFor="cap-cat">
                <select id="cap-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]">
                  <option value="">— Auto from rule —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Notes" htmlFor="cap-notes">
              <textarea id="cap-notes" value={notes} rows={2} onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-[13px] outline-none focus:border-[var(--color-accent)]" />
            </Field>

            {error && <InlineError text={error} />}

            <footer className="mt-1 flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} className="h-9 rounded-md border border-[var(--color-border)] px-3 text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-panel-2)]">
                Cancel
              </button>
              <button type="submit" disabled={phase === 'saving'}
                className="h-9 rounded-md px-4 text-[13px] font-semibold text-white disabled:opacity-60"
                style={{ background: 'var(--color-primary)' }}
              >
                {phase === 'saving' ? 'Saving…' : 'Save expense'}
              </button>
            </footer>
          </form>
        )}

        {phase === 'done' && (
          <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--color-ok-bg)', color: 'var(--color-ok)' }}>
              <CheckCircle2 size={26} />
            </div>
            <p className="text-[14.5px] font-semibold text-[var(--color-ink)]">Saved</p>
            <p className="text-[12px] text-[var(--color-ink-3)]">Transaction recorded on Petty Cash.</p>
            <button type="button" onClick={onClose} className="mt-3 h-9 rounded-md px-4 text-[13px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={htmlFor} className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--color-ink-3)]">{label}</label>
      {children}
    </div>
  )
}

function InlineError({ text }: { text: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-[var(--color-bad)] bg-[var(--color-bad-bg)] px-3 py-2 text-[12.5px] flex items-center gap-2"
      style={{ color: 'var(--color-bad)' }}
    >
      <AlertTriangle size={13} />
      {text}
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const map = {
    high:   { bg: 'var(--color-ok-bg)',  fg: 'var(--color-ok)',  label: 'High confidence' },
    medium: { bg: 'var(--color-warn-bg)', fg: 'var(--color-warn)', label: 'Verify amounts' },
    low:    { bg: 'var(--color-bad-bg)', fg: 'var(--color-bad)', label: 'Low — check' },
  }[confidence]
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[.05em]"
      style={{ background: map.bg, color: map.fg }}
    >
      {map.label}
    </span>
  )
}
