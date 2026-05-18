import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import { requireRole } from '../middleware/role.middleware'
import {
  listTransactions,
  updateTransaction,
  bulkUpdateTransactions,
  getTransactionAudit,
  createManualTransaction,
} from '../controllers/transaction.controller'

const reviewRoles = ['TENANT_OWNER', 'FINANCE_MANAGER', 'ACCOUNTANT'] as const
const createRoles = ['TENANT_OWNER', 'FINANCE_MANAGER'] as const

export function registerTransactionRoutes(app: Hono<AppEnv>) {
  app.get('/transactions', sessionMiddleware, requireRole(...reviewRoles), listTransactions)
  app.post('/transactions/manual', sessionMiddleware, requireRole(...createRoles), createManualTransaction)
  app.get('/transactions/:id/audit', sessionMiddleware, requireRole(...reviewRoles), getTransactionAudit)
  app.patch('/transactions', sessionMiddleware, requireRole(...reviewRoles), bulkUpdateTransactions)
  app.patch('/transactions/:id', sessionMiddleware, requireRole(...reviewRoles), updateTransaction)
}
