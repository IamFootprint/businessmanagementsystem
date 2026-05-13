import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { registerRoutes } from './routes/index'

export function createApp() {
  const app = new Hono()
  app.use('*', logger())
  registerRoutes(app)
  return app
}
