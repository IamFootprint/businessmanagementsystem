import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { login, logout, getMe } from '../controllers/auth.controller'
import { sessionMiddleware } from '../middleware/session.middleware'
import { loginRateLimitMiddleware } from '../middleware/rate-limit.middleware'

export function registerAuthRoutes(app: Hono<AppEnv>) {
  app.post('/auth/login', loginRateLimitMiddleware, login)
  app.post('/auth/logout', sessionMiddleware, logout)
  app.get('/auth/me', sessionMiddleware, getMe)
}
