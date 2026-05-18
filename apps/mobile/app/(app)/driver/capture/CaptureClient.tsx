'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Camera, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react'
import { captureReceiptAction, confirmReceiptAction, type ReceiptCaptureResult } from '../actions'

type Business = { id: string; name: string }
type Category = { id: string; name: string }

type Phase = 'pick' | 'uploading' | 'review' | 'saving' | 'done'

export function CaptureClient({ businesses, categories }: { businesses: Business[]; categories: Category[] }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('pick')
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [capture, setCapture] = useState<ReceiptCaptureResult | null>(null)

  // Editable review fields
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes] = useState('')

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

    // Pre-fill the form from OCR + suggestions
    setDate(result.ocr?.transactionDate ?? new Date().toISOString().slice(0, 10))
    setAmount(result.ocr?.totalAmount != null ? String(result.ocr.totalAmount.toFixed(2)) : '')
    setDescription(result.ocr?.merchant ?? '')
    setBusinessId(result.suggestion?.businessId ?? result.receipt?.hintBusinessId ?? '')
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

    const result = await confirmReceiptAction(fd)
    if (!result.ok) {
      setError(result.error ?? 'Save failed')
      setPhase('review')
      return
    }
    setPhase('done')
  }

  const reset = () => {
    setCapture(null)
    setPreviewUrl(null)
    setError(null)
    setPhase('pick')
  }

  // ── PHASE: pick ────────────────────────────────────────────────────────────
  if (phase === 'pick') {
    return (
      <div className="flex flex-col gap-4 px-4 pb-10 pt-5">
        <Link href="/driver" className="flex items-center gap-1 text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
          <ArrowLeft size={14} />
          Back
        </Link>

        <h1 className="text-[22px] font-semibold" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}>
          Capture receipt
        </h1>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-2xl px-6 py-12 flex flex-col items-center gap-3 active:opacity-80"
          style={{
            background: 'var(--color-surface)',
            border: '2px dashed var(--color-border-2)',
            color: 'var(--color-ink-2)',
          }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}
          >
            <Camera size={32} />
          </div>
          <span className="text-[14px] font-semibold" style={{ color: 'var(--color-ink)' }}>Take a photo</span>
          <span className="text-[11.5px]">JPEG / PNG, up to 10 MB</span>
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

        {error && (
          <InlineError text={error} />
        )}
      </div>
    )
  }

  // ── PHASE: uploading ───────────────────────────────────────────────────────
  if (phase === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-20">
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Receipt preview"
            className="max-h-64 rounded-xl"
            style={{ border: '1px solid var(--color-border)' }}
          />
        )}
        <div className="flex items-center gap-2 text-[13.5px]" style={{ color: 'var(--color-ink-2)' }}>
          <Loader2 size={16} className="animate-spin" />
          Reading the receipt…
        </div>
        <p className="text-[11.5px]" style={{ color: 'var(--color-ink-3)' }}>
          (3–5 seconds while AI extracts the fields)
        </p>
      </div>
    )
  }

  // ── PHASE: review ──────────────────────────────────────────────────────────
  if (phase === 'review' || phase === 'saving') {
    const confidence = capture?.ocr?.confidence ?? 'low'
    const matchedSupplier = capture?.suggestion?.supplierMatch
    return (
      <div className="flex flex-col gap-4 px-4 pb-10 pt-5">
        <div className="flex items-center justify-between">
          <button onClick={reset} className="flex items-center gap-1 text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
            <RotateCcw size={14} />
            Retake
          </button>
          <ConfidenceBadge confidence={confidence} />
        </div>

        <h1 className="text-[20px] font-semibold" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}>
          Review and confirm
        </h1>

        {previewUrl && (
          <img
            src={previewUrl}
            alt="Receipt"
            className="max-h-48 self-center rounded-xl"
            style={{ border: '1px solid var(--color-border)' }}
          />
        )}

        {matchedSupplier && (
          <div
            className="rounded-lg px-3 py-2 text-[12px] flex items-center gap-2"
            style={{ background: 'rgba(52, 211, 153, 0.10)', color: 'var(--color-pos)' }}
          >
            <CheckCircle2 size={13} />
            Matched supplier: <span className="font-semibold">{matchedSupplier.name}</span>
          </div>
        )}

        <form onSubmit={handleConfirm} className="flex flex-col gap-3">
          <Field label="Date" htmlFor="cap-date">
            <input
              id="cap-date" type="date" value={date} required
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 px-3 rounded-lg text-[15px] outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}
            />
          </Field>
          <Field label="Amount (R)" htmlFor="cap-amount">
            <input
              id="cap-amount" type="number" min="0" step="0.01" value={amount} required
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-11 px-3 rounded-lg text-[15px] tabular-nums outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}
            />
          </Field>
          <Field label="Merchant / description" htmlFor="cap-desc">
            <input
              id="cap-desc" type="text" value={description} required
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-11 px-3 rounded-lg text-[15px] outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}
            />
          </Field>
          <Field label="Business" htmlFor="cap-biz">
            <select
              id="cap-biz" value={businessId} required
              onChange={(e) => setBusinessId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg text-[15px] outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}
            >
              <option value="">— Select business —</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Category (optional)" htmlFor="cap-cat">
            <select
              id="cap-cat" value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg text-[15px] outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}
            >
              <option value="">— Auto from rule —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Notes (optional)" htmlFor="cap-notes">
            <textarea
              id="cap-notes" value={notes} rows={2}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}
            />
          </Field>

          {error && <InlineError text={error} />}

          <button
            type="submit" disabled={phase === 'saving'}
            className="h-12 rounded-lg text-[15px] font-semibold disabled:opacity-60"
            style={{ background: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}
          >
            {phase === 'saving' ? 'Saving…' : 'Submit'}
          </button>
        </form>
      </div>
    )
  }

  // ── PHASE: done ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: 'rgba(52, 211, 153, 0.18)', color: 'var(--color-pos)' }}
      >
        <CheckCircle2 size={36} />
      </div>
      <h1 className="text-[22px] font-semibold" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}>
        Receipt submitted
      </h1>
      <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
        We've recorded your expense. Finance will review it shortly.
      </p>
      <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
        <button
          type="button" onClick={reset}
          className="h-12 rounded-lg text-[15px] font-semibold"
          style={{ background: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}
        >
          Capture another
        </button>
        <Link
          href="/driver/submissions"
          className="h-12 rounded-lg flex items-center justify-center text-[14px]"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink-2)' }}
        >
          View my submissions
        </Link>
      </div>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[10.5px] font-semibold uppercase tracking-[.06em]" style={{ color: 'var(--color-ink-3)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function InlineError({ text }: { text: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg px-3 py-2 text-[12.5px] flex items-center gap-2"
      style={{ background: 'rgba(248, 113, 113, 0.10)', color: 'var(--color-bad)' }}
    >
      <AlertTriangle size={13} />
      {text}
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const styles = {
    high:   { bg: 'rgba(52, 211, 153, 0.16)', fg: 'var(--color-pos)', label: 'High confidence' },
    medium: { bg: 'rgba(251, 146, 60, 0.16)', fg: 'var(--color-warn)', label: 'Verify amounts' },
    low:    { bg: 'rgba(248, 113, 113, 0.14)', fg: 'var(--color-bad)', label: 'Low — please check' },
  }[confidence]
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[.05em]"
      style={{ background: styles.bg, color: styles.fg }}
    >
      {styles.label}
    </span>
  )
}
