import { PrismaClient } from '@prisma/client'
import { AsyncLocalStorage } from 'node:async_hooks'

export * from '@prisma/client'
export { seedRules } from './seed/rules'
export type { SeedRulesResult } from './seed/rules'

/**
 * On Cloudflare Workers, multiple concurrent requests can run inside the same
 * isolate. Module-scoped I/O objects (e.g. a cached PrismaClient with a Neon
 * WebSocket) created during one request's I/O context cannot be reused from a
 * different request — the runtime throws "Cannot perform I/O on behalf of a
 * different request".
 *
 * To support both Cloudflare Workers (per-request scoping) and Node.js
 * (process-wide singleton), we use AsyncLocalStorage to thread a request-scoped
 * client through the entire async call tree. Workers wrap `app.fetch(...)` in
 * `withPrisma(client, () => ...)`; controllers can keep using the existing
 * `prisma` import unchanged.
 */
const prismaStore = new AsyncLocalStorage<PrismaClient>()

let _fallbackClient: PrismaClient | undefined

/**
 * @deprecated For Cloudflare Workers, wrap requests with `withPrisma(client, fn)`
 * instead. The setter is kept for Node.js compatibility (e.g. test setup).
 */
export function setPrismaClient(client: PrismaClient): void {
  _fallbackClient = client
}

/**
 * Run `fn` with `client` available to the `prisma` proxy. Use this on
 * Cloudflare Workers to scope a fresh PrismaClient per request.
 */
export function withPrisma<T>(client: PrismaClient, fn: () => Promise<T> | T): Promise<T> {
  return Promise.resolve(prismaStore.run(client, fn))
}

function getClient(): PrismaClient {
  const scoped = prismaStore.getStore()
  if (scoped) return scoped
  if (!_fallbackClient) {
    _fallbackClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }
  return _fallbackClient
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as Function).bind(client) : value
  },
})
