import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import { requireRole } from '../middleware/role.middleware'
import {
  uploadReceiptPublic,
  listReceipts,
  updateReceipt,
  matchReceipt,
  markStaleReceipts,
  captureReceipt,
  listMyReceipts,
} from '../controllers/receipt.controller'

const captureRoles = ['TENANT_OWNER', 'FINANCE_MANAGER', 'ACCOUNTANT', 'DRIVER'] as const

export function registerReceiptRoutes(app: Hono<AppEnv>) {
  app.post('/receipts/public', uploadReceiptPublic)
  app.get('/receipts', sessionMiddleware, listReceipts)
  app.get('/receipts/mine', sessionMiddleware, listMyReceipts)
  app.post('/receipts/capture', sessionMiddleware, requireRole(...captureRoles), captureReceipt)
  app.patch('/receipts/:id', sessionMiddleware, updateReceipt)
  app.post('/receipts/mark-stale', sessionMiddleware, markStaleReceipts)
  app.post('/receipts/:id/match', sessionMiddleware, matchReceipt)
}
