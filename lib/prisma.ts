import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ─── Tenant-Scoped Queries (RLS) ────────────────────────────────────────────

export type TxClient = Prisma.TransactionClient;

/**
 * Run a callback within a transaction that has the shop RLS context set.
 * Uses SET LOCAL so the setting is scoped to this transaction only.
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
