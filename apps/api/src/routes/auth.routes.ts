import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { login, logout, getMe } from '../controllers/auth.controller'
import { sessionMiddleware } from '../middleware/session.middleware'

export function registerAuthRoutes(app: Hono<AppEnv>) {
  app.post('/auth/login', login)
  app.post('/auth/logout', sessionMiddleware, logout)
  app.get('/auth/me', sessionMiddleware, getMe)
}
