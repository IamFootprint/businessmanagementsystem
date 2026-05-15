import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import { requireRole } from '../middleware/role.middleware'
import { seedRulesAdmin } from '../controllers/admin.controller'

export function registerAdminRoutes(app: Hono<AppEnv>) {
  app.post('/admin/seed-rules', sessionMiddleware, requireRole('TENANT_OWNER'), seedRulesAdmin)
}
