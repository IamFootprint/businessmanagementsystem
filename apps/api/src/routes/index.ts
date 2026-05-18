import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { getHealth, getDbHealth } from '../controllers/health.controller'
import { registerAuthRoutes } from './auth.routes'
import { registerImportRoutes } from './import.routes'
import { registerTransactionRoutes } from './transaction.routes'
import { registerSupplierRoutes } from './supplier.routes'
import { registerRuleRoutes } from './rule.routes'
import { registerReceiptRoutes } from './receipt.routes'
import { registerPeriodRoutes } from './period.routes'
import { registerNotifyRoutes } from './notify.routes'
import { registerCategoryRoutes } from './category.routes'
import { registerAdminRoutes } from './admin.routes'
import { registerAnalyticsRoutes } from './analytics.routes'
import { sessionMiddleware } from '../middleware/session.middleware'
import { prisma } from '@bms/db'

export function registerRoutes(app: Hono<AppEnv>) {
  app.get('/health', getHealth)
  app.get('/health/db', getDbHealth)
  registerAuthRoutes(app)
  registerImportRoutes(app)
  registerTransactionRoutes(app)
  registerSupplierRoutes(app)
  registerRuleRoutes(app)
  registerReceiptRoutes(app)
  registerPeriodRoutes(app)
  registerNotifyRoutes(app)
  registerCategoryRoutes(app)
  registerAdminRoutes(app)
  registerAnalyticsRoutes(app)

  // Lightweight businesses listing for client forms.
  app.get('/businesses', sessionMiddleware, async (c) => {
    const user = c.get('user')
    const data = await prisma.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    })
    return c.json({ data })
  })

  // TEMPORARY bootstrap. Removed in the follow-up commit after the migration lands.
  app.post('/admin/bootstrap-driver-migration', async (c) => {
    const token = c.req.header('X-Bootstrap-Token')
    if (!token || token !== 'bms-bootstrap-driver-2026-05-18') {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DRIVER';`,
      )
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultBusinessId" TEXT;`,
      )
      await prisma.$executeRawUnsafe(
        `DO $$ BEGIN
          ALTER TABLE "User" ADD CONSTRAINT "User_defaultBusinessId_fkey"
            FOREIGN KEY ("defaultBusinessId") REFERENCES "Business"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      )
      return c.json({ ok: true, applied: ['UserRole.DRIVER', 'User.defaultBusinessId', 'User.defaultBusinessId FK'] })
    } catch (err) {
      return c.json({ ok: false, error: err instanceof Error ? err.message : 'unknown' }, 500)
    }
  })
}
