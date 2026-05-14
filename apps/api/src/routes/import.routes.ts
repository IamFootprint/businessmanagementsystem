import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import { requireRole } from '../middleware/role.middleware'
import { createImport, listImports } from '../controllers/import.controller'

export function registerImportRoutes(app: Hono<AppEnv>) {
  app.get('/imports', sessionMiddleware, requireRole('TENANT_OWNER', 'FINANCE_MANAGER'), listImports)
  app.post('/imports', sessionMiddleware, requireRole('TENANT_OWNER', 'FINANCE_MANAGER'), createImport)
}
