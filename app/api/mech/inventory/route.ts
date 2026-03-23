import { ok } from "@/lib/api/responses";
import { requireRole } from "@/src/lib/auth/localSession";
import { listInventoryItems, seedInventoryIfEmpty } from "@/src/lib/workshop/inventory";

export async function GET() {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  await seedInventoryIfEmpty();
  const items = await listInventoryItems();
  return ok({ items: items.filter((item) => item.isActive) });
}
