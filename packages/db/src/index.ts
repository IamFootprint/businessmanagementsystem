import { PrismaClient } from '@prisma/client'

export * from '@prisma/client'
export { seedRules } from './seed/rules'
export type { SeedRulesResult } from './seed/rules'

let _client: PrismaClient | undefined

export function setPrismaClient(client: PrismaClient): void {
  _client = client
}

function getClient(): PrismaClient {
  if (!_client) {
    _client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }
  return _client
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as Function).bind(client) : value
  },
})
