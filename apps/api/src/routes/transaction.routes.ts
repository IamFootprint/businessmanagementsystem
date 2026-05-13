import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import { requireRole } from '../middleware/role.middleware'
import {
  listTransactions,
  updateTransaction,
  bulkUpdateTransactions,
} from '../controllers/transaction.controller'

const reviewRoles = ['TENANT_OWNER', 'FINANCE_MANAGER', 'ACCOUNTANT'] as const

export function registerTransactionRoutes(app: Hono<AppEnv>) {
  app.get('/transactions', sessionMiddleware, requireRole(...reviewRoles), listTransactions)
  app.patch('/transactions', sessionMiddleware, requireRole(...reviewRoles), bulkUpdateTransactions)
  app.patch('/transactions/:id', sessionMiddleware, requireRole(...reviewRoles), updateTransaction)
}
