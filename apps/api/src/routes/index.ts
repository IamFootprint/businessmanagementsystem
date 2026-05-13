import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { getHealth, getDbHealth } from '../controllers/health.controller'
import { registerAuthRoutes } from './auth.routes'
import { registerImportRoutes } from './import.routes'
import { registerTransactionRoutes } from './transaction.routes'
import { registerSupplierRoutes } from './supplier.routes'
import { registerRuleRoutes } from './rule.routes'
import { registerReceiptRoutes } from './receipt.routes'

export function registerRoutes(app: Hono<AppEnv>) {
  app.get('/health', getHealth)
  app.get('/health/db', getDbHealth)
  registerAuthRoutes(app)
  registerImportRoutes(app)
  registerTransactionRoutes(app)
  registerSupplierRoutes(app)
  registerRuleRoutes(app)
  registerReceiptRoutes(app)
}
