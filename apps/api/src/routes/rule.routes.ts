import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import { requireRole } from '../middleware/role.middleware'
import { listRules, createRule, applyRules } from '../controllers/rule.controller'

export function registerRuleRoutes(app: Hono<AppEnv>) {
  app.get('/rules', sessionMiddleware, requireRole('TENANT_OWNER', 'FINANCE_MANAGER'), listRules)
  app.post('/rules', sessionMiddleware, requireRole('TENANT_OWNER', 'FINANCE_MANAGER'), createRule)
  app.post('/rules/apply', sessionMiddleware, requireRole('TENANT_OWNER', 'FINANCE_MANAGER'), applyRules)
}
