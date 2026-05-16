import Link from 'next/link'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { ArrowLeft, Tag, AlertCircle } from 'lucide-react'

type Category = {
  id: string
  name: string
  categoryType: 'REVENUE' | 'EXPENSE' | 'TRANSFER' | 'OWNER' | 'LOAN' | 'TAX' | 'UNKNOWN'
  receiptRequired: boolean
  active: boolean
}

const TYPE_COLOR: Record<Category['categoryType'], string> = {
  REVENUE: 'var(--color-pos)',
  EXPENSE: 'var(--color-neg)',
  TRANSFER: 'var(--color-ink-2)',
  OWNER: 'var(--color-warn)',
  LOAN: 'var(--color-warn)',
  TAX: 'var(--color-accent)',
  UNKNOWN: 'var(--color-ink-3)',
}

const TYPE_ORDER: Array<Category['categoryType']> = ['REVENUE','EXPENSE','TRANSFER','OWNER','LOAN','TAX','UNKNOWN']

export default async function CategoriesPage() {
  let categories: Category[] = []
  let error = false
  try {
    const res = await apiRequestAuthenticated<{ data?: Category[]; categories?: Category[] }>('/categories')
    categories = res.data ?? res.categories ?? []
  } catch { error = true }

  const byType: Record<string, Category[]> = {}
  for (const c of categories) {
    if (!byType[c.categoryType]) byType[c.categoryType] = []
    byType[c.categoryType].push(c)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-5">
      <div className="flex items-center gap-2">
        <Link href="/more" aria-label="Back" className="p-1 active:opacity-60">
          <ArrowLeft size={20} style={{ color: 'var(--color-ink-3)' }} />
        </Link>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--color-ink)' }}>
          Categories
        </h1>
      </div>
      <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
        {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
      </p>

      {error && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <AlertCircle size={28} style={{ color: 'var(--color-bad)' }} />
          <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>Failed to load categories</p>
        </div>
      )}

      {!error && TYPE_ORDER.map((type) => {
        const list = (byType[type] ?? []).sort((a, b) => a.name.localeCompare(b.name))
        if (list.length === 0) return null
        return (
          <div key={type}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: TYPE_COLOR[type] }}>
              {type} <span style={{ color: 'var(--color-ink-4)' }}>({list.length})</span>
            </p>
            <div className="card overflow-hidden rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              {list.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}
                >
                  <Tag size={14} style={{ color: TYPE_COLOR[type] }} />
                  <span className="flex-1 text-[13px]" style={{ color: 'var(--color-ink)' }}>{c.name}</span>
                  {c.receiptRequired && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-[.04em]"
                          style={{ background: 'color-mix(in srgb, var(--color-warn) 14%, transparent)', color: 'var(--color-warn)' }}>
                      Receipt
                    </span>
                  )}
                  {!c.active && (
                    <span className="text-[10px]" style={{ color: 'var(--color-ink-4)' }}>Inactive</span>
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
