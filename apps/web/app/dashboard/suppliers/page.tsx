import { Building2, ExternalLink, Tag } from 'lucide-react'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { isSafeUrl } from '@/lib/url'

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
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Suppliers</h1>
        <div role="alert" className="mt-6 rounded-md px-4 py-3 text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, white)', color: 'var(--color-destructive)' }}>
          Unable to load suppliers. Please try again.
        </div>
      </div>
    )
  }

  const { data: suppliers } = result

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Suppliers</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Building2 className="h-10 w-10" style={{ color: 'var(--color-muted-foreground)' }} />
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              No suppliers yet. Suppliers are created when transactions are categorised.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((supplier) => (
            <Card key={supplier.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{supplier.name}</CardTitle>
                {isSafeUrl(supplier.website) && (
                  <CardDescription>
                    <a
                      href={supplier.website!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                      style={{ color: 'var(--color-muted-foreground)' }}
                    >
                      {supplier.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {supplier.aliases.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
                      <Tag className="h-3 w-3" />
                      Aliases
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {supplier.aliases.map((a) => (
                        <Badge key={a.id} variant="secondary" className="font-mono text-xs">
                          {a.pattern}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>No aliases</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
