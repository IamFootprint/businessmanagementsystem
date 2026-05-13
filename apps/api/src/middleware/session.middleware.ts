import type { MiddlewareHandler } from 'hono'
import { prisma } from '@bms/db'
import type { AppEnv, SessionUser } from '../types'

export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = auth.slice(7)
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
    }
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const sessionUser: SessionUser = {
    id: session.user.id,
    tenantId: session.user.tenantId,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    active: session.user.active,
  }
  c.set('user', sessionUser)
  await next()
}
