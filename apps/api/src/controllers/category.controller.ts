// apps/api/src/controllers/category.controller.ts
import type { Context } from 'hono'
import { prisma } from '@bms/db'
import type { AppEnv } from '../types'
import type { CategoryType } from '@bms/db'

export async function listCategories(c: Context<AppEnv>) {
  const user = c.get('user')
  try {
    const categories = await prisma.category.findMany({
      where: { tenantId: user.tenantId, active: true },
      orderBy: [{ categoryType: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, categoryType: true, receiptRequired: true, active: true },
    })
    return c.json({ data: categories })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function createCategory(c: Context<AppEnv>) {
  const user = c.get('user')
  type Body = { name: string; categoryType: CategoryType; receiptRequired?: boolean }
  const body = await c.req.json<Body>().catch(() => ({} as Body))

  if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)
  if (!body.categoryType) return c.json({ error: 'categoryType is required' }, 400)
  const VALID_TYPES: CategoryType[] = ['REVENUE', 'EXPENSE', 'TRANSFER', 'OWNER', 'LOAN', 'TAX', 'UNKNOWN']
  if (!VALID_TYPES.includes(body.categoryType)) return c.json({ error: 'invalid categoryType' }, 400)

  try {
    const category = await prisma.category.create({
      data: {
        tenantId: user.tenantId,
        name: body.name.trim(),
        categoryType: body.categoryType,
        receiptRequired: body.receiptRequired ?? false,
      },
    })
    return c.json(category, 201)
  } catch (err) {
    const isUnique = err instanceof Error && 'code' in err &&
      (err as Record<string, unknown>)['code'] === 'P2002'
    return c.json({ error: isUnique ? 'Category name already exists' : 'Internal server error' }, isUnique ? 409 : 500)
  }
}

export async function updateCategory(c: Context<AppEnv>) {
  const user = c.get('user')
  const { id } = c.req.param()

  const existing = await prisma.category.findFirst({ where: { id, tenantId: user.tenantId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  type Body = { name?: string; receiptRequired?: boolean }
  const body: Body = await c.req.json<Body>().catch(() => ({}))

  if (body.name !== undefined && !body.name.trim()) return c.json({ error: 'name cannot be empty' }, 400)
  if (!body.name?.trim() && body.receiptRequired === undefined) return c.json({ error: 'No updatable fields provided' }, 400)

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(body.name?.trim() ? { name: body.name.trim() } : {}),
        ...(body.receiptRequired !== undefined ? { receiptRequired: body.receiptRequired } : {}),
      },
    })
    return c.json(updated)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function deleteCategory(c: Context<AppEnv>) {
  const user = c.get('user')
  const { id } = c.req.param()

  const existing = await prisma.category.findFirst({ where: { id, tenantId: user.tenantId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.category.update({ where: { id }, data: { active: false } })
  return c.json({ ok: true })
}
