import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { SuppliersClient } from './SuppliersClient'

type Alias = { id: string; pattern: string }
type Supplier = {
  id: string
  name: string
  website: string | null
  notes: string | null
  aliases: Alias[]
}

async function getSuppliers(): Promise<{ ok: true; data: Supplier[] } | { ok: false }> {
  try {
    const res = await apiRequestAuthenticated<{ data: Supplier[] }>('/suppliers')
    return { ok: true, data: res.data }
  } catch {
    return { ok: false }
  }
}

export default async function SuppliersPage() {
  const result = await getSuppliers()

  if (!result.ok) {
    return (
      <div className="p-8">
        <h1
          className="text-[26px] font-semibold tracking-[-0.02em]"
          style={{ color: 'var(--color-ink)' }}
        >
          Suppliers
        </h1>
        <div
          role="alert"
          className="mt-6 rounded-md px-4 py-3 text-sm"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-bad) 8%, transparent)',
            color: 'var(--color-bad)',
          }}
        >
          Unable to load suppliers. Please try again.
        </div>
      </div>
    )
  }

  return <SuppliersClient suppliers={result.data} />
}
