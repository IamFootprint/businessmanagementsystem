import Link from 'next/link'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { ArrowLeft, Building2, AlertCircle, ExternalLink } from 'lucide-react'

type Supplier = {
  id: string
  name: string
  website: string | null
  notes: string | null
  active: boolean
}

export default async function SuppliersPage() {
  let suppliers: Supplier[] = []
  let error = false
  try {
    const res = await apiRequestAuthenticated<{ data?: Supplier[]; suppliers?: Supplier[] }>('/suppliers')
    suppliers = res.data ?? res.suppliers ?? []
  } catch { error = true }

  const sorted = [...suppliers].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-5">
      <div className="flex items-center gap-2">
        <Link href="/more" aria-label="Back" className="p-1 active:opacity-60">
          <ArrowLeft size={20} style={{ color: 'var(--color-ink-3)' }} />
        </Link>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--color-ink)' }}>
          Suppliers
        </h1>
      </div>
      <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
        {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} · {suppliers.filter((s) => s.notes).length} with research notes
      </p>

      {error && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <AlertCircle size={28} style={{ color: 'var(--color-bad)' }} />
          <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>Failed to load suppliers</p>
        </div>
      )}

      {!error && (
        <div className="flex flex-col gap-2">
          {sorted.map((s) => (
            <details
              key={s.id}
              className="rounded-xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <summary
                className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 active:opacity-80"
                style={{ outline: 'none' }}
              >
                <Building2 size={14} style={{ color: 'var(--color-accent)' }} />
                <span className="flex-1 truncate text-[13px] font-medium" style={{ color: 'var(--color-ink)' }}>
                  {s.name}
                </span>
                {!s.active && (
                  <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-[.04em]"
                        style={{ background: 'var(--color-surface-2)', color: 'var(--color-ink-3)' }}>Inactive</span>
                )}
              </summary>
              <div className="border-t px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
                {s.website && (
                  <a
                    href={s.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-2 inline-flex items-center gap-1 text-[12px]"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {s.website.replace(/^https?:\/\//, '')} <ExternalLink size={10} />
                  </a>
                )}
                {s.notes ? (
                  <p className="text-[12px] leading-[1.5]" style={{ color: 'var(--color-ink-2)' }}>
                    {s.notes}
                  </p>
                ) : (
                  <p className="text-[12px] italic" style={{ color: 'var(--color-ink-3)' }}>
                    No notes yet
                  </p>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
