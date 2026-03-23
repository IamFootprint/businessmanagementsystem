import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'

/**
 * Validates that a value is a UUID v4 string before it can be
 * interpolated into a raw SQL statement.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidShopId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

/**
 * Executes `fn` inside a PostgreSQL transaction with `app.current_shop_id`
 * set to `shopId` for the duration of that transaction.
 *
 * This activates the RLS policies in the database (migration
 * 20260315120000_add_rls_policies) which filter all tenant-scoped tables
 * by `"shopId" = current_setting('app.current_shop_id')`.
 *
 * SET LOCAL means the variable is scoped to the current transaction only
 * and is automatically cleared when the transaction ends.
 *
 * Usage:
 *   const bookings = await withShopContext(shopId, (tx) => tx.booking.findMany())
 */
export async function withShopContext<T>(
  shopId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  if (!isValidShopId(shopId)) {
    throw new Error(`Invalid shopId: must be a valid UUID v4`)
  }

  return prisma.$transaction(async (tx) => {
    // Use set_config() which is safe to parameterize.
    // is_local = true scopes the setting to this transaction.
    await tx.$executeRaw`SELECT set_config('app.current_shop_id', ${shopId}, true)`
    return fn(tx)
  })
}
