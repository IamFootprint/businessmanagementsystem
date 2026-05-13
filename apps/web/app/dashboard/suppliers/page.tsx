import { apiRequestAuthenticated } from '@/lib/api-client.server'

type Alias = { id: string; pattern: string }
type Supplier = {
  id: string
  name: string
  website: string | null
  notes: string | null
  aliases: Alias[]
}

async function getSuppliers() {
  try {
    const res = await apiRequestAuthenticated<{ data: Supplier[] }>('/suppliers')
    return res.data
  } catch {
    return [] as Supplier[]
  }
}

export default async function SuppliersPage() {
  const suppliers = await getSuppliers()

  return (
    <main style={{ padding: 32, maxWidth: 800 }}>
      <h1>Suppliers</h1>

      <form method="GET" action="/dashboard/suppliers/new" style={{ marginBottom: 24 }}>
        <a
          href="/dashboard/suppliers/new"
          style={{ padding: '8px 16px', background: '#28a745', color: '#fff', borderRadius: 4, textDecoration: 'none' }}
        >
          + Add Supplier
        </a>
      </form>

      {suppliers.length === 0 && <p style={{ color: '#666' }}>No suppliers yet.</p>}

      {suppliers.map(supplier => (
        <div key={supplier.id} style={{ marginBottom: 24, padding: 16, border: '1px solid #ddd', borderRadius: 4 }}>
          <h2 style={{ margin: '0 0 4px' }}>{supplier.name}</h2>
          {supplier.website && (
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#666' }}>{supplier.website}</p>
          )}
          <div>
            <strong style={{ fontSize: 12 }}>Aliases:</strong>
            {supplier.aliases.length === 0 ? (
              <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>none</span>
            ) : (
              <ul style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
                {supplier.aliases.map(a => (
                  <li key={a.id} style={{ fontSize: 12, fontFamily: 'monospace' }}>{a.pattern}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </main>
  )
}
