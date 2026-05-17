import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import { requireRole } from '../middleware/role.middleware'
import { seedRulesAdmin, clearTransactionDataAdmin, bulkImportCsvAdmin, backfillBusinessIds, reapplyRules } from '../controllers/admin.controller'

export function registerAdminRoutes(app: Hono<AppEnv>) {
  app.post('/admin/seed-rules', sessionMiddleware, requireRole('TENANT_OWNER'), seedRulesAdmin)
  app.post('/admin/backfill-business-ids', sessionMiddleware, requireRole('TENANT_OWNER'), backfillBusinessIds)
  app.post('/admin/reapply-rules', sessionMiddleware, requireRole('TENANT_OWNER'), reapplyRules)
  app.post('/admin/clear-transaction-data', sessionMiddleware, requireRole('TENANT_OWNER'), clearTransactionDataAdmin)
  app.post('/admin/bulk-import-csv', sessionMiddleware, requireRole('TENANT_OWNER'), bulkImportCsvAdmin)
}
