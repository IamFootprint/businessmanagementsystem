import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import {
  login, logout, getMe, updateMe,
  changePassword, listSessions, signOutAll, revokeSession,
} from '../controllers/auth.controller'
import { sessionMiddleware } from '../middleware/session.middleware'
import { loginRateLimitMiddleware, passwordChangeRateLimit } from '../middleware/rate-limit.middleware'

export function registerAuthRoutes(app: Hono<AppEnv>) {
  app.post('/auth/login', loginRateLimitMiddleware, login)
  app.post('/auth/logout', sessionMiddleware, logout)
  app.get('/auth/me', sessionMiddleware, getMe)
  app.patch('/auth/me', sessionMiddleware, updateMe)
  app.post('/auth/change-password', sessionMiddleware, passwordChangeRateLimit, changePassword)
  app.get('/auth/sessions', sessionMiddleware, listSessions)
  app.post('/auth/sign-out-all', sessionMiddleware, signOutAll)
  app.delete('/auth/sessions/:id', sessionMiddleware, revokeSession)
}
