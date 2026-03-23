import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ─── Tenant-Scoped Queries (RLS) ────────────────────────────────────────────
//
// PostgreSQL RLS policies filter rows by:
//   current_setting('app.current_shop_id', true)
//
// SET LOCAL scopes the setting to the current transaction only,
// so concurrent requests on different connections don't interfere.

export type TxClient = Prisma.TransactionClient;

/**
 * Run a callback within a transaction that has the shop RLS context set.
 * All Prisma queries inside `fn` will be filtered by the RLS policies.
 *
 * Usage:
 *   const bookings = await withShopContext(shopId, (tx) =>
 *     tx.booking.findMany({ orderBy: { createdAt: "desc" } })
 *   );
 */
export async function withShopContext<T>(
  shopId: string,
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(`SET LOCAL app.current_shop_id = $1`, shopId);
    return fn(tx);
  });
}
