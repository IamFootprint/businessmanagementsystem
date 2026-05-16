import Link from 'next/link'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { ArrowLeft, Zap, CheckCircle2, AlertCircle } from 'lucide-react'

type Rule = {
  id: string
  name: string
  descriptionPattern: string
  priority: number
  active: boolean
  trustedAutoReview: boolean
  isPersonal: boolean | null
  transactionType: string | null
  category: { id: string; name: string } | null
  supplier: { id: string; name: string } | null
  business: { id: string; name: string; slug: string } | null
}

export default async function RulesPage() {
  let rules: Rule[] = []
  let error = false
  try {
    const res = await apiRequestAuthenticated<{ data: Rule[] }>('/rules')
    rules = res.data ?? []
  } catch { error = true }

  const byBucket: Record<string, Rule[]> = { REVENUE: [], EXPENSE: [], BANK_CHARGE: [], OTHER: [] }
  for (const r of rules) {
    const bucket = r.transactionType === 'REVENUE' ? 'REVENUE'
      : r.transactionType === 'BANK_CHARGE' ? 'BANK_CHARGE'
      : r.transactionType === 'EXPENSE' ? 'EXPENSE'
      : 'OTHER'
    byBucket[bucket].push(r)
  }

  const BUCKETS: Array<{ key: keyof typeof byBucket; label: string }> = [
    { key: 'REVENUE', label: 'Revenue' },
    { key: 'EXPENSE', label: 'Expenses' },
    { key: 'BANK_CHARGE', label: 'Bank charges' },
    { key: 'OTHER', label: 'Other' },
  ]

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-5">
      <div className="flex items-center gap-2">
        <Link href="/more" aria-label="Back" className="p-1 active:opacity-60">
          <ArrowLeft size={20} style={{ color: 'var(--color-ink-3)' }} />
        </Link>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--color-ink)' }}>
          Rules
        </h1>
      </div>
      <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
        {rules.length} transaction rule{rules.length !== 1 ? 's' : ''} · {rules.filter((r) => r.trustedAutoReview).length} auto-review
      </p>

      {error && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <AlertCircle size={28} style={{ color: 'var(--color-bad)' }} />
          <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>Failed to load rules</p>
        </div>
      )}

      {!error && BUCKETS.map(({ key, label }) => {
        const list = byBucket[key]
        if (list.length === 0) return null
        return (
          <div key={key}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--color-ink-3)' }}>
              {label} <span style={{ color: 'var(--color-ink-4)' }}>({list.length})</span>
            </p>
            <div className="card overflow-hidden rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              {list
                .sort((a, b) => b.priority - a.priority)
                .map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-start gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}
                >
                  <Zap size={14} style={{ color: 'var(--color-accent)', marginTop: 2 }} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[13px] font-medium" style={{ color: 'var(--color-ink)' }}>{r.name}</span>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
                      &ldquo;{r.descriptionPattern}&rdquo;
                    </span>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px]">
                      {r.category && (
                        <span className="rounded px-1.5 py-0.5" style={{ background: 'var(--color-surface-2)', color: 'var(--color-ink-2)' }}>
                          {r.category.name}
                        </span>
                      )}
                      {r.business && (
                        <span className="rounded px-1.5 py-0.5" style={{ background: 'color-mix(in srgb, var(--color-accent) 14%, transparent)', color: 'var(--color-accent)' }}>
                          {r.business.name}
                        </span>
                      )}
                      {r.isPersonal && (
                        <span className="rounded px-1.5 py-0.5" style={{ background: 'color-mix(in srgb, var(--color-warn) 14%, transparent)', color: 'var(--color-warn)' }}>
                          Personal
                        </span>
                      )}
                    </div>
                  </div>
                  {r.trustedAutoReview && (
                    <CheckCircle2 size={14} style={{ color: 'var(--color-pos)', marginTop: 2 }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
