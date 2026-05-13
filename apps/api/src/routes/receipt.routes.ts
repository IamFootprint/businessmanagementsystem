import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import {
  uploadReceiptPublic,
  listReceipts,
  updateReceipt,
  matchReceipt,
  markStaleReceipts,
} from '../controllers/receipt.controller'

export function registerReceiptRoutes(app: Hono<AppEnv>) {
  app.post('/receipts/public', uploadReceiptPublic)
  app.get('/receipts', sessionMiddleware, listReceipts)
  app.patch('/receipts/:id', sessionMiddleware, updateReceipt)
  app.post('/receipts/mark-stale', sessionMiddleware, markStaleReceipts)
  app.post('/receipts/:id/match', sessionMiddleware, matchReceipt)
}
