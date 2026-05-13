import type { Context } from 'hono'
import { prisma } from '@bms/db'
import { verifyPassword } from '../lib/password'
import { randomBytes } from 'crypto'
import type { AppEnv, SessionUser } from '../types'

const ALLOWED_DOMAIN = '@kgolaentle.com'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function login(c: Context<AppEnv>) {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({} as { email?: string; password?: string }))
  const { email, password } = body

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }

  // Domain check — same 401 as bad credentials to avoid enumeration
  if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

  if (!user || !user.active) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await prisma.$transaction([
    prisma.session.create({
      data: { userId: user.id, token, expiresAt },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
  ])

  const responseUser: SessionUser = {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
  }

  return c.json({ token, user: responseUser })
}

export async function logout(c: Context<AppEnv>) {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = auth.slice(7)
  await prisma.session.deleteMany({ where: { token } })
  return c.json({ ok: true })
}

export async function getMe(c: Context<AppEnv>) {
  const user = c.get('user')
  return c.json({ user })
}
