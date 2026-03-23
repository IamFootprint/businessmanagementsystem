// Re-export the singleton Prisma client from the root lib.
// This path is used by src/lib/ modules and their tests.
export { prisma } from '@/lib/prisma'
export type { TxClient } from '@/lib/prisma'
