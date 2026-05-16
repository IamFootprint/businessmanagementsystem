import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import { analyticsOverview } from '../controllers/analytics.controller'

export function registerAnalyticsRoutes(app: Hono<AppEnv>) {
  app.get('/analytics/overview', sessionMiddleware, analyticsOverview)
}
