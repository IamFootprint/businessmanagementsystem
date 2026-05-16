import Link from 'next/link'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { ArrowLeft, ArrowUpFromLine, CheckCircle2, AlertCircle } from 'lucide-react'
import { ImportForm } from './ImportForm'

type Import = {
  id: string
  fileName: string
  rowCount: number
  importedCount: number
  duplicateCount: number
  errorCount: number
  status: string
  createdAt: string
  bankAccount?: { nickname?: string; bankName?: string }
}

const STATUS_COLORS: Record<string, { bg: string; fg: string; icon: typeof CheckCircle2 }> = {
  COMPLETE:   { bg: 'color-mix(in srgb, var(--color-pos) 14%, transparent)', fg: 'var(--color-pos)', icon: CheckCircle2 },
  PROCESSING: { bg: 'color-mix(in srgb, var(--color-warn) 14%, transparent)', fg: 'var(--color-warn)', icon: ArrowUpFromLine },
  FAILED:     { bg: 'color-mix(in srgb, var(--color-bad) 14%, transparent)', fg: 'var(--color-bad)', icon: AlertCircle },
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const today = new Date()
  const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round((today0.getTime() - d0.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })
}

export default async function ImportPage() {
  let imports: Import[] = []
  let error = false
  try {
    const res = await apiRequestAuthenticated<{ data: Import[] }>('/imports')
    imports = res.data ?? []
  } catch { error = true }

  // Default bank account from seed
  const bankAccountId = 'seed-stdbank-main'

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-5">
      <div className="flex items-center gap-2">
        <Link href="/more" aria-label="Back" className="p-1 active:opacity-60">
          <ArrowLeft size={20} style={{ color: 'var(--color-ink-3)' }} />
        </Link>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--color-ink)' }}>
          Import
        </h1>
      </div>

      <ImportForm bankAccountId={bankAccountId} />

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--color-ink-3)' }}>
          Recent imports
        </p>
        {error ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <AlertCircle size={24} style={{ color: 'var(--color-bad)' }} />
            <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>Failed to load imports</p>
          </div>
        ) : imports.length === 0 ? (
          <p className="py-6 text-center text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
            No imports yet.
          </p>
        ) : (
          <div className="card overflow-hidden rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {imports.slice(0, 30).map((imp, i) => {
              const tone = STATUS_COLORS[imp.status] ?? STATUS_COLORS.PROCESSING
              const Icon = tone.icon
              return (
                <div
                  key={imp.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: tone.bg }}>
                    <Icon size={14} style={{ color: tone.fg }} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-medium" style={{ color: 'var(--color-ink)' }}>
                      {imp.fileName}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
                      {fmtDate(imp.createdAt)} · {imp.importedCount} imported
                      {imp.duplicateCount > 0 && ` · ${imp.duplicateCount} dup`}
                      {imp.errorCount > 0 && ` · ${imp.errorCount} err`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
