import type { MiddlewareHandler } from 'hono'
import { prisma } from '@bms/db'
import type { AppEnv } from '../types'

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
    if (session) await prisma.session.delete({ where: { id: session.id } })
    return c.json({ error: 'Unauthorized' }, 401)
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...safeUser } = session.user
  c.set('user', safeUser)
  await next()
}
