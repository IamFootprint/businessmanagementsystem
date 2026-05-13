import type { Context } from 'hono'
import { prisma } from '@bms/db'
import type { AppEnv } from '../types'

export async function listSuppliers(c: Context<AppEnv>) {
  const user = c.get('user')
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId: user.tenantId, active: true },
      orderBy: { name: 'asc' },
      include: { aliases: { select: { id: true, pattern: true } } },
    })
    return c.json({ data: suppliers })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function getSupplier(c: Context<AppEnv>) {
  const user = c.get('user')
  const { id } = c.req.param()
  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { aliases: true },
  })
  if (!supplier) return c.json({ error: 'Not found' }, 404)
  return c.json(supplier)
}

export async function createSupplier(c: Context<AppEnv>) {
  const user = c.get('user')
  type CreateBody = { name: string; website?: string; notes?: string }
  const body: CreateBody = await c.req.json<CreateBody>()
    .catch(() => ({ name: '' } as CreateBody))

  if (!body.name?.trim()) {
    return c.json({ error: 'name is required' }, 400)
  }

  try {
    const supplier = await prisma.supplier.create({
      data: {
        tenantId: user.tenantId,
        name: body.name.trim(),
        website: body.website?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    })
    return c.json(supplier, 201)
  } catch (err) {
    const isUnique = err instanceof Error && 'code' in err &&
      (err as Record<string, unknown>)['code'] === 'P2002'
    return c.json({ error: isUnique ? 'Supplier with this name already exists' : 'Internal server error' }, isUnique ? 409 : 500)
  }
}

export async function addSupplierAlias(c: Context<AppEnv>) {
  const user = c.get('user')
  const { id } = c.req.param()

  const supplier = await prisma.supplier.findFirst({ where: { id, tenantId: user.tenantId } })
  if (!supplier) return c.json({ error: 'Not found' }, 404)

  type AliasBody = { pattern: string }
  const body: AliasBody = await c.req.json<AliasBody>().catch(() => ({ pattern: '' } as AliasBody))
  if (!body.pattern?.trim()) return c.json({ error: 'pattern is required' }, 400)

  try {
    const alias = await prisma.supplierAlias.create({
      data: { supplierId: id, pattern: body.pattern.trim().toUpperCase() },
    })
    return c.json(alias, 201)
  } catch {
    return c.json({ error: 'Alias pattern already exists for this supplier' }, 409)
  }
}
