import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { prisma, seedRules } from '@bms/db'

/**
 * POST /admin/seed-rules — seeds transaction rules from supplier research.
 *
 * Idempotent: re-running upserts existing records. Restricted to TENANT_OWNER
 * via role middleware. Runs inside the Worker context so DATABASE_URL never
 * needs to be exposed outside Cloudflare.
 */
export async function seedRulesAdmin(c: Context<AppEnv>) {
  try {
    const result = await seedRules(prisma)
    return c.json({
      ok: true,
      ...result,
    })
  } catch (err) {
    return c.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Seed failed',
      },
      500,
    )
  }
}
