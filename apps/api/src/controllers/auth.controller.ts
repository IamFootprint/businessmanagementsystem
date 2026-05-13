import type { Context } from 'hono'
import { prisma } from '@bms/db'
import { verifyPassword, DUMMY_HASH } from '../lib/password'
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

  let dbUser: Awaited<ReturnType<typeof prisma.user.findUnique>> = null
  try {
    dbUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }

  // Always run bcrypt to prevent timing attacks that distinguish missing/inactive accounts
  const hashToVerify = dbUser?.active ? dbUser.passwordHash : DUMMY_HASH
  const valid = await verifyPassword(password, hashToVerify)

  if (!dbUser || !dbUser.active || !valid) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  try {
    await prisma.$transaction([
      prisma.session.create({
        data: { userId: dbUser!.id, token, expiresAt },
      }),
      prisma.user.update({
        where: { id: dbUser!.id },
        data: { lastLoginAt: new Date() },
      }),
    ])
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }

  const responseUser: SessionUser = {
    id: dbUser!.id,
    tenantId: dbUser!.tenantId,
    email: dbUser!.email,
    name: dbUser!.name,
    role: dbUser!.role,
    active: dbUser!.active,
  }

  return c.json({ token, user: responseUser })
}

export async function logout(c: Context<AppEnv>) {
  const auth = c.req.header('Authorization')!
  const token = auth.slice(7) // Safe: sessionMiddleware already validated 'Bearer ' prefix
  try {
    await prisma.session.deleteMany({ where: { token } })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
  return c.json({ ok: true })
}

export async function getMe(c: Context<AppEnv>) {
  const user = c.get('user')
  return c.json({ user })
}
