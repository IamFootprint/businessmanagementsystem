import type { Context } from 'hono'
import { prisma } from '@bms/db'

export async function getHealth(c: Context) {
  return c.json({ status: 'ok' })
}

export async function getDbHealth(c: Context) {
  const start = Date.now()
  await prisma.$queryRaw`SELECT 1`
  return c.json({ status: 'ok', latencyMs: Date.now() - start })
}
