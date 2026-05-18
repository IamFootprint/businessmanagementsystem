import type { Context, MiddlewareHandler } from 'hono'
import type { AppEnv } from '../types'

type BucketEntry = { count: number; resetAt: number }
type Buckets = Map<string, BucketEntry>

function makeRateLimit(
  buckets: Buckets,
  windowMs: number,
  maxAttempts: number,
  errorMessage: string,
  keyFn: (c: Context<AppEnv>) => string,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const key = keyFn(c)
    const now = Date.now()
    const entry = buckets.get(key)

    if (!entry || entry.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
    } else {
      entry.count++
      if (entry.count > maxAttempts) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
        c.header('Retry-After', String(retryAfter))
        return c.json({ error: errorMessage }, 429)
      }
    }
    await next()
  }
}

function ipKey(c: Context<AppEnv>): string {
  return (
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0].trim() ??
    'unknown'
  )
}

function userIdKey(c: Context<AppEnv>): string {
  // session middleware must run before this for c.get('user') to exist.
  try {
    return c.get('user')?.id ?? ipKey(c)
  } catch {
    return ipKey(c)
  }
}

const loginBuckets: Buckets = new Map()
const passwordChangeBuckets: Buckets = new Map()

export const loginRateLimitMiddleware = makeRateLimit(
  loginBuckets,
  15 * 60 * 1000,
  5,
  'Too many login attempts. Please try again later.',
  ipKey,
)

export const passwordChangeRateLimit = makeRateLimit(
  passwordChangeBuckets,
  15 * 60 * 1000,
  5,
  'Too many password change attempts. Please try again later.',
  userIdKey,
)
