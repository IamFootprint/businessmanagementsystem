import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import {
  listPeriods,
  createPeriod,
  lockPeriod,
  unlockPeriod,
  getPeriodReport,
  exportPeriodCsv,
} from '../controllers/period.controller'

export function registerPeriodRoutes(app: Hono<AppEnv>) {
  app.get('/periods', sessionMiddleware, listPeriods)
  app.post('/periods', sessionMiddleware, createPeriod)
  app.post('/periods/:id/lock', sessionMiddleware, lockPeriod)
  app.post('/periods/:id/unlock', sessionMiddleware, unlockPeriod)
  app.get('/periods/:id/report', sessionMiddleware, getPeriodReport)
  app.get('/periods/:id/export', sessionMiddleware, exportPeriodCsv)
}
