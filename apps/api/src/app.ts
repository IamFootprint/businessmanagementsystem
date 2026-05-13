import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { registerRoutes } from './routes/index'
import type { AppEnv } from './types'

export function createApp() {
  const app = new Hono<AppEnv>()
  app.use('*', logger())
  registerRoutes(app)
  return app
}
