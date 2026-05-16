'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2 } from 'lucide-react'

export function ImportForm({ bankAccountId }: { bankAccountId: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setMsg({ text: 'Select a CSV or XLSX file first', tone: 'err' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bankAccountId', bankAccountId)
      const res = await fetch('/api/imports', { method: 'POST', body: fd })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body) {
        setMsg({ text: body?.error ?? `Upload failed (${res.status})`, tone: 'err' })
      } else {
        setMsg({
          text: `Imported ${body.importedCount} · ${body.duplicateCount ?? 0} duplicates · ${body.errorCount ?? 0} errors`,
          tone: 'ok',
        })
        if (fileRef.current) fileRef.current.value = ''
        router.refresh()
      }
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Upload failed', tone: 'err' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label
        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl px-4 py-6 transition-colors active:opacity-80"
        style={{ background: 'var(--color-surface)', border: '1.5px dashed var(--color-border)' }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          disabled={busy}
        />
        <Upload size={20} style={{ color: 'var(--color-accent)' }} />
        <span className="text-[13px] font-medium" style={{ color: 'var(--color-ink)' }}>
          Tap to select CSV or XLSX
        </span>
        <span className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
          Standard Bank format: Date, Description, Amount, Balance
        </span>
      </label>

      <button
        type="submit"
        disabled={busy}
        className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold transition-opacity active:opacity-60 disabled:opacity-50"
        style={{ background: 'var(--color-accent)', color: 'var(--color-accent-fg, #fff)' }}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {busy ? 'Uploading…' : 'Upload statement'}
      </button>

      {msg && (
        <div
          role="status"
          className="rounded-lg px-3 py-2 text-[12px]"
          style={{
            background: msg.tone === 'ok'
              ? 'color-mix(in srgb, var(--color-pos) 14%, transparent)'
              : 'color-mix(in srgb, var(--color-bad) 14%, transparent)',
            color: msg.tone === 'ok' ? 'var(--color-pos)' : 'var(--color-bad)',
          }}
        >
          {msg.text}
        </div>
      )}
    </form>
  )
}
