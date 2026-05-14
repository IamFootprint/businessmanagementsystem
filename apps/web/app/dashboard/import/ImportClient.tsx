'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud, X, CheckCircle2, AlertCircle, ArrowDownToLine } from 'lucide-react'
import NextLink from 'next/link'
import { importCsvAction, type ImportState } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type PreviewRow = {
  date: string
  desc: string
  amount: number
}

type Stage = 'idle' | 'preview' | 'done'

type ImportRecord = {
  id: string
  fileName: string
  rowCount: number
  importedCount: number
  duplicateCount: number
  errorCount: number
  status: string
  createdAt: string
  bankAccount: { nickname: string; bankName: string }
  importedBy: { name: string }
}

interface ImportClientProps {
  history: ImportRecord[]
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseStdBankCsv(text: string): PreviewRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  const headerIdx = lines.findIndex(l => /date/i.test(l) && /amount/i.test(l))
  if (headerIdx === -1) return []

  const dataLines = lines.slice(headerIdx + 1)
  const rows: PreviewRow[] = []

  for (const line of dataLines) {
    const cols = parseCsvLine(line)
    const date = cols[0] ?? ''
    if (!/^\d{2,4}[\/\-]\d{2}[\/\-]\d{2,4}$/.test(date.trim())) continue
    const desc = cols[1] ?? ''
    const rawAmount = (cols[2] ?? cols[3] ?? '').replace(/R|,|\s/g, '')
    const amount = parseFloat(rawAmount)
    if (isNaN(amount)) continue
    rows.push({ date: date.trim(), desc: desc.trim(), amount })
  }

  return rows
}

function formatAmount(amount: number): string {
  const abs = Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (amount < 0 ? '-' : '+') + 'R ' + abs
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportClient({ history }: ImportClientProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<ImportState, FormData>(
    importCsvAction,
    null
  )

  const [stage, setStage] = useState<Stage>('idle')
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [fileBlob, setFileBlob] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [bankAccountId, setBankAccountId] = useState('seed-stdbank-main')
  const [localError, setLocalError] = useState<string | null>(null)
  const [isXlsx, setIsXlsx] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mirror server action result into local state for display/stage transitions
  useEffect(() => {
    if (state?.summary) {
      setStage('done')
      setLocalError(null)
      router.refresh()
    } else if (state?.error) {
      setLocalError(state.error)
      setStage('idle')
    }
  }, [state])

  function handleFile(file: File) {
    setFileName(file.name)
    setFileBlob(file)
    setLocalError(null)
    const name = file.name.toLowerCase()
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      setIsXlsx(true)
      setPreviewRows([])
      setStage('preview')
      return
    }
    setIsXlsx(false)
    const reader = new FileReader()
    reader.onerror = () => setLocalError('Could not read the file. Please try again.')
    reader.onload = e => {
      const text = e.target?.result
      if (typeof text !== 'string') {
        setLocalError('Could not read the file. Please try again.')
        return
      }
      const rows = parseStdBankCsv(text)
      setPreviewRows(rows)
      setStage('preview')
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleConfirm() {
    if (!fileBlob) return
    const fd = new FormData()
    fd.append('file', fileBlob)
    fd.append('bankAccountId', bankAccountId)
    formAction(fd)
  }

  function resetToIdle() {
    setStage('idle')
    setPreviewRows([])
    setFileName('')
    setFileBlob(null)
    setLocalError(null)
    setIsXlsx(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const newCount = previewRows.length
  const dupCount = 0 // duplicates detected server-side; preview shows 0

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      {/* Page head */}
      <div className="mb-6">
        <h1
          className="text-[26px] font-semibold tracking-[-0.02em]"
          style={{ color: 'var(--color-ink)' }}
        >
          Import bank statement
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
          Upload a Standard Bank CSV or Excel export — descriptions are matched against supplier aliases
        </p>
      </div>

      {/* Error banner */}
      {localError && (
        <div
          className="mb-5 flex items-start gap-2 rounded-md px-3 py-2.5 text-[13px]"
          style={{
            backgroundColor: 'color-mix(in srgb,var(--color-bad) 10%,transparent)',
            color: 'var(--color-bad)',
            border: '1px solid color-mix(in srgb,var(--color-bad) 25%,transparent)',
          }}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {localError}
        </div>
      )}

      {/* ── Stage: done ── */}
      {stage === 'done' && state?.summary ? (
        <div
          className="rounded-[10px] border bg-[var(--color-panel)]"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Head */}
          <div
            className="flex items-center gap-2.5 border-b px-5 py-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--color-ok)' }} />
            <p className="text-[14px] font-semibold" style={{ color: 'var(--color-ok)' }}>
              Import complete
            </p>
          </div>
          {/* Body */}
          <div className="p-5">
            <dl className="space-y-2.5">
              {(
                [
                  ['File', state.summary.fileName, false],
                  ['Total rows', state.summary.rowCount, false],
                  ['Imported', state.summary.importedCount, false],
                  ['Duplicates skipped', state.summary.duplicateCount, false],
                  ['Errors', state.summary.errorCount, true],
                  [
                    'Opening balance',
                    state.summary.openingBalanceCents != null
                      ? `R ${(state.summary.openingBalanceCents / 100).toFixed(2)}`
                      : '—',
                    false,
                  ],
                  [
                    'Closing balance',
                    state.summary.closingBalanceCents != null
                      ? `R ${(state.summary.closingBalanceCents / 100).toFixed(2)}`
                      : '—',
                    false,
                  ],
                ] as [string, string | number, boolean][]
              ).map(([label, value, isError]) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
                    {label}
                  </dt>
                  <dd
                    className="text-[13px] font-medium"
                    style={{
                      color:
                        isError && Number(value) > 0
                          ? 'var(--color-bad)'
                          : 'var(--color-ink)',
                    }}
                  >
                    {String(value ?? '—')}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          {/* Footer */}
          <div
            className="flex items-center justify-end border-t px-5 py-3"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <NextLink
              href="/dashboard/transactions?reviewStatus=NEEDS_REVIEW"
              className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium transition-colors hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
              }}
            >
              Review imported transactions →
            </NextLink>
          </div>
        </div>
      ) : (
        <>
          {/* ── Two-column grid (idle) ── */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Left card: Upload CSV */}
            <div
              className="rounded-[10px] border bg-[var(--color-panel)]"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* Head */}
              <div
                className="border-b px-5 py-4"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p className="text-[14px] font-semibold" style={{ color: 'var(--color-ink)' }}>
                  Upload file
                </p>
                <p className="mt-0.5 text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
                  Standard Bank format · CSV or Excel (.xlsx/.xls) · descriptions, dates, amounts
                </p>
              </div>
              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Bank account select */}
                <div>
                  <label
                    htmlFor="bankAccount"
                    className="mb-1.5 block text-[12px] font-semibold"
                    style={{ color: 'var(--color-ink-3)' }}
                  >
                    Bank account
                  </label>
                  <select
                    id="bankAccount"
                    value={bankAccountId}
                    onChange={e => setBankAccountId(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-[13px] focus:outline-none"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-panel)',
                      color: 'var(--color-ink)',
                    }}
                  >
                    <option value="seed-stdbank-main">Standard Bank Main</option>
                  </select>
                </div>

                {/* Drop zone */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-[12px] px-4 py-8 text-center transition-colors"
                  style={{
                    border: `1.5px dashed ${isDragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    backgroundColor: isDragging
                      ? 'color-mix(in srgb,var(--color-accent) 10%,transparent)'
                      : 'var(--color-panel-2)',
                  }}
                >
                  <UploadCloud
                    style={{ width: 28, height: 28, color: 'var(--color-ink-3)' }}
                  />
                  <p
                    className="mt-3 text-[14px] font-medium"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {isDragging ? 'Drop to upload' : 'Drop file here, or click to browse'}
                  </p>
                  <p
                    className="mt-1 font-mono text-[11.5px]"
                    style={{ color: 'var(--color-ink-3)' }}
                  >
                    .csv · .xlsx · .xls
                  </p>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {/* Footer */}
              <div
                className="flex items-center justify-end gap-3 border-t px-5 py-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <button
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-40"
                  style={{ color: 'var(--color-ink-3)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  <UploadCloud className="h-4 w-4" />
                  Choose file
                </button>
              </div>
            </div>

            {/* Right card: How import works */}
            <div
              className="rounded-[10px] border bg-[var(--color-panel)]"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* Head */}
              <div
                className="border-b px-5 py-4"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p className="text-[14px] font-semibold" style={{ color: 'var(--color-ink)' }}>
                  How import works
                </p>
              </div>
              {/* Body */}
              <div className="px-5 py-2">
                {[
                  {
                    n: 1,
                    title: 'Parse file',
                    desc: 'Standard Bank CSV or Excel export columns mapped automatically.',
                  },
                  {
                    n: 2,
                    title: 'Detect duplicates',
                    desc: 'Rows with the same date + amount + description are skipped.',
                  },
                  {
                    n: 3,
                    title: 'Apply aliases',
                    desc: 'Description matches a supplier alias → supplier + default category linked.',
                  },
                  {
                    n: 4,
                    title: 'Stage for review',
                    desc: 'New transactions land in "Needs review" until you approve them.',
                  },
                ].map(step => (
                  <div
                    key={step.n}
                    className="grid items-start gap-3 py-[10px]"
                    style={{
                      gridTemplateColumns: '28px 1fr',
                      borderBottom: `1px solid var(--color-border-2, var(--color-border))`,
                    }}
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[12px] font-semibold"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb,var(--color-accent) 12%,transparent)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      {step.n}
                    </span>
                    <div>
                      <p
                        className="text-[13px] font-medium"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {step.title}
                      </p>
                      <p
                        className="mt-0.5 text-[12px]"
                        style={{ color: 'var(--color-ink-3)' }}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Stage: preview ── */}
          {stage === 'preview' && (
            <div
              className="mt-5 rounded-[10px] border bg-[var(--color-panel)]"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* Head */}
              <div
                className="flex items-start justify-between border-b px-5 py-4"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div>
                  <p
                    className="text-[14px] font-semibold"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    Preview · {fileName}
                  </p>
                  <p className="mt-0.5 text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
                    {isXlsx
                      ? 'Excel file — rows will be counted after upload'
                      : `${previewRows.length} rows parsed · `}
                    {!isXlsx && (
                      <>
                        <span style={{ color: 'var(--color-ok)' }}>{newCount} new</span> ·{' '}
                        <span style={{ color: 'var(--color-warn)' }}>{dupCount} duplicate</span>
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={resetToIdle}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--color-panel-2)]"
                  style={{ color: 'var(--color-ink-2)' }}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr
                      className="border-b"
                      style={{
                        backgroundColor: 'var(--color-panel-2)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[.06em]"
                        style={{ width: 110, color: 'var(--color-ink-3)' }}
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[.06em]"
                        style={{ color: 'var(--color-ink-3)' }}
                      >
                        Description
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[.06em]"
                        style={{ color: 'var(--color-ink-3)' }}
                      >
                        Auto-matched supplier
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[.06em]"
                        style={{ width: 130, color: 'var(--color-ink-3)' }}
                      >
                        Amount
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[.06em]"
                        style={{ width: 110, color: 'var(--color-ink-3)' }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <td
                          className="px-3 py-2.5 font-mono"
                          style={{
                            color: 'var(--color-ink-2)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {row.date}
                        </td>
                        <td
                          className="px-3 py-2.5 font-medium"
                          style={{ color: 'var(--color-ink)' }}
                        >
                          {row.desc}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="text-[12px] italic"
                            style={{ color: 'var(--color-ink-4, var(--color-ink-3))' }}
                          >
                            No match
                          </span>
                        </td>
                        <td
                          className="px-3 py-2.5 text-right font-mono font-medium"
                          style={{
                            color:
                              row.amount < 0
                                ? 'var(--color-neg)'
                                : 'var(--color-pos)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatAmount(row.amount)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{
                              backgroundColor:
                                'color-mix(in srgb,var(--color-ok) 15%,transparent)',
                              color: 'var(--color-ok)',
                            }}
                          >
                            <span
                              className="inline-block h-[5px] w-[5px] rounded-full"
                              style={{ backgroundColor: 'var(--color-ok)' }}
                            />
                            New
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-end gap-3 border-t px-5 py-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <button
                  onClick={resetToIdle}
                  className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--color-panel-2)]"
                  style={{ color: 'var(--color-ink-2)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isPending || (!isXlsx && newCount === 0)}
                  className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  {isPending ? 'Importing…' : isXlsx ? 'Import Excel file' : `Import ${newCount} transactions`}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Import history */}
      {history.length > 0 && (
        <div className="mt-8">
          <p
            className="mb-3 text-[14px] font-semibold"
            style={{ color: 'var(--color-ink)' }}
          >
            Import history
          </p>
          <div
            className="rounded-[10px] border overflow-hidden"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-panel-2)', borderBottom: '1px solid var(--color-border)' }}>
                  {['File', 'Account', 'Imported', 'Duplicates', 'Errors', 'By', 'Date'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[.06em]"
                      style={{ color: 'var(--color-ink-3)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((imp, i) => (
                  <tr
                    key={imp.id}
                    style={{
                      borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                      backgroundColor: 'var(--color-panel)',
                    }}
                  >
                    <td className="px-4 py-2.5 font-mono text-[12px] max-w-[200px] truncate" style={{ color: 'var(--color-ink-2)' }}>
                      {imp.fileName}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--color-ink-2)' }}>
                      {imp.bankAccount.nickname}
                    </td>
                    <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--color-ok)' }}>
                      {imp.importedCount}
                    </td>
                    <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--color-ink-3)' }}>
                      {imp.duplicateCount}
                    </td>
                    <td
                      className="px-4 py-2.5 font-mono"
                      style={{ color: imp.errorCount > 0 ? 'var(--color-bad)' : 'var(--color-ink-3)' }}
                    >
                      {imp.errorCount}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--color-ink-3)' }}>
                      {imp.importedBy.name}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
                      {new Date(imp.createdAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
