import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../types'

type BucketEntry = { count: number; resetAt: number }
const store = new Map<string, BucketEntry>()

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

export const loginRateLimitMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0].trim() ??
    'unknown'

  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    entry.count++
    if (entry.count > MAX_ATTEMPTS) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      c.header('Retry-After', String(retryAfter))
      return c.json({ error: 'Too many login attempts. Please try again later.' }, 429)
    }
  }

  await next()
}
