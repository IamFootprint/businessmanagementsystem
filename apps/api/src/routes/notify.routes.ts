import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import {
  notifyImportComplete,
  notifyCloseReminder,
  notifyStaleReceipts,
} from '../controllers/notify.controller'

export function registerNotifyRoutes(app: Hono<AppEnv>) {
  app.post('/notify/import', sessionMiddleware, notifyImportComplete)
  app.post('/notify/close-reminder', sessionMiddleware, notifyCloseReminder)
  app.post('/notify/stale-receipts', sessionMiddleware, notifyStaleReceipts)
}
