import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import {
  createInventoryItem,
  listInventoryItems,
  seedInventoryIfEmpty,
  updateInventoryItem
} from "@/src/lib/workshop/inventory";
import { logAudit } from "@/lib/admin/audit";
import { ok, badRequest, notFound } from "@/lib/api/responses";

const createSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  unitPriceCents: z.number().int().min(0),
  costCents: z.number().int().min(0).optional(),
  stockOnHand: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true)
});

const patchSchema = createSchema.partial().extend({
  id: z.string().min(1)
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  await seedInventoryIfEmpty();
  const items = await listInventoryItems();
  return ok({ items });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_INVENTORY_PAYLOAD", "Invalid inventory payload.");
  }
  const item = await createInventoryItem(parsed.data);
  await logAudit({
    actor: auth.phone,
    action: "inventory.item.create",
    entity: "inventory_item",
    entityId: item.id,
    metadata: { name: item.name, category: item.category },
    shopId: auth.shopId!
  });
  return ok({ item });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_INVENTORY_PATCH", "Invalid inventory patch.");
  }
  const { id, ...updates } = parsed.data;
  const item = await updateInventoryItem(id, updates);
  if (!item) {
    return notFound("INVENTORY_ITEM_NOT_FOUND", "Inventory item not found.");
  }
  await logAudit({
    actor: auth.phone,
    action: "inventory.item.update",
    entity: "inventory_item",
    entityId: item.id,
    metadata: updates,
    shopId: auth.shopId!
  });
  return ok({ item });
}
