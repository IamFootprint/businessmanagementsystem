import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { getHealth, getDbHealth } from '../controllers/health.controller'
import { registerAuthRoutes } from './auth.routes'

export function registerRoutes(app: Hono<AppEnv>) {
  app.get('/health', getHealth)
  app.get('/health/db', getDbHealth)
  registerAuthRoutes(app)
}
