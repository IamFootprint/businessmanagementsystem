import type { Hono } from 'hono'
import { getHealth, getDbHealth } from '../controllers/health.controller'

export function registerRoutes(app: Hono) {
  app.get('/health', getHealth)
  app.get('/health/db', getDbHealth)
}
