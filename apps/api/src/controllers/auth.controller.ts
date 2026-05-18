import type { Context } from 'hono'
import { prisma } from '@bms/db'
import { verifyPassword, DUMMY_HASH, hashPassword } from '../lib/password'
import { validatePassword } from '../lib/password-policy'
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

  const ipAddress =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    null
  const userAgent = c.req.header('User-Agent')?.slice(0, 500) ?? null

  try {
    await prisma.$transaction([
      prisma.session.create({
        data: { userId: dbUser!.id, token, expiresAt, ipAddress, userAgent },
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
  // Don't fall back to the in-context user on a missing-row hit — that would
  // leak deactivated state and stale phone numbers. Surface the error instead.
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, name: true, role: true, phone: true, active: true, lastLoginAt: true, createdAt: true },
  })
  if (!fresh) return c.json({ error: 'User not found' }, 404)
  return c.json({ user: fresh })
}

/**
 * PATCH /auth/me — update own profile fields (name, phone).
 * Email + role + tenant changes require admin endpoints.
 */
export async function updateMe(c: Context<AppEnv>) {
  const user = c.get('user')
  type Body = { name?: string; phone?: string | null }
  const body = await c.req.json<Body>().catch(() => ({} as Body))

  const updates: { name?: string; phone?: string | null } = {}

  if (body.name !== undefined) {
    const trimmed = body.name.trim()
    if (!trimmed) return c.json({ error: 'Name cannot be empty' }, 400)
    if (trimmed.length > 100) return c.json({ error: 'Name is too long (max 100 chars)' }, 400)
    updates.name = trimmed
  }

  if (body.phone !== undefined) {
    if (body.phone === null || body.phone === '') {
      updates.phone = null
    } else {
      const cleaned = body.phone.trim()
      if (!/^[+\d][\d\s()-]{5,30}$/.test(cleaned)) return c.json({ error: 'Phone number is not a valid format' }, 400)
      updates.phone = cleaned
    }
  }

  if (Object.keys(updates).length === 0) return c.json({ error: 'Nothing to update' }, 400)

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updates,
    select: { id: true, email: true, name: true, role: true, phone: true, active: true, lastLoginAt: true },
  })

  return c.json({ ok: true, user: updated })
}

/**
 * POST /auth/change-password — verify current password, set new password,
 * revoke all sessions for this user EXCEPT the current one so the user
 * stays signed in on the device they're using.
 *
 * Rate-limited by user id (5 attempts / 15 min).
 */
export async function changePassword(c: Context<AppEnv>) {
  const user = c.get('user')
  const currentSessionId = c.get('sessionId')

  type Body = { currentPassword?: string; newPassword?: string }
  const body = await c.req.json<Body>().catch(() => ({} as Body))

  if (!body.currentPassword) return c.json({ error: 'currentPassword is required' }, 400)
  if (!body.newPassword) return c.json({ error: 'newPassword is required' }, 400)

  const policy = validatePassword(body.newPassword)
  if (!policy.ok) return c.json({ error: policy.error }, 400)

  if (body.currentPassword === body.newPassword) {
    return c.json({ error: 'New password must be different from current password' }, 400)
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  // Always run bcrypt to prevent timing attacks
  const valid = await verifyPassword(body.currentPassword, dbUser?.passwordHash ?? DUMMY_HASH)
  // 400, not 401 — the caller IS authenticated; their submitted credential is
  // wrong. 401 would trip auth-redirect middleware on web/mobile clients.
  if (!dbUser || !valid) return c.json({ error: 'Current password is incorrect' }, 400)

  const newHash = await hashPassword(body.newPassword)

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } }),
    // Kill every other session — the current one stays so the user isn't logged out mid-operation.
    prisma.session.deleteMany({ where: { userId: user.id, NOT: { id: currentSessionId } } }),
  ])

  return c.json({ ok: true })
}

/**
 * GET /auth/sessions — list active sessions for the current user. The
 * "current" flag marks the session being used to make this request so the
 * UI can show "this device" and disable the revoke button on it.
 */
export async function listSessions(c: Context<AppEnv>) {
  const user = c.get('user')
  const currentSessionId = c.get('sessionId')

  const sessions = await prisma.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    select: { id: true, createdAt: true, lastSeenAt: true, expiresAt: true, ipAddress: true, userAgent: true },
    orderBy: { lastSeenAt: 'desc' },
  })

  return c.json({
    data: sessions.map((s) => ({ ...s, current: s.id === currentSessionId })),
  })
}

/**
 * POST /auth/sign-out-all — revoke every session for the current user
 * EXCEPT the one making this request. Useful when the user suspects a
 * compromise or just wants to clean up old devices.
 */
export async function signOutAll(c: Context<AppEnv>) {
  const user = c.get('user')
  const currentSessionId = c.get('sessionId')

  const result = await prisma.session.deleteMany({
    where: { userId: user.id, NOT: { id: currentSessionId } },
  })

  return c.json({ ok: true, revoked: result.count })
}

/**
 * DELETE /auth/sessions/:id — revoke a specific session (must belong to
 * the current user). The user can't revoke their own active session via
 * this endpoint — use /auth/logout for that.
 */
export async function revokeSession(c: Context<AppEnv>) {
  const user = c.get('user')
  const currentSessionId = c.get('sessionId')
  const { id } = c.req.param()

  if (id === currentSessionId) return c.json({ error: 'Use /auth/logout to end the current session' }, 400)

  const session = await prisma.session.findUnique({ where: { id }, select: { userId: true } })
  if (!session || session.userId !== user.id) return c.json({ error: 'Not found' }, 404)

  await prisma.session.delete({ where: { id } })
  return c.json({ ok: true })
}
