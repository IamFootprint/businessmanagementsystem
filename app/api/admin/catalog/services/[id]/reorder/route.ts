import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { ServiceItemsRepo } from "@/src/lib/store";
import { logAudit } from "@/lib/admin/audit";
import { ok, badRequest, notFound } from "@/lib/api/responses";

const schema = z.object({
  sortOrder: z.number().int().min(0)
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_REORDER_PAYLOAD", "Invalid reorder payload.");
  }

  const updated = await ServiceItemsRepo.update(context.params.id, {
    sortOrder: parsed.data.sortOrder
  });
  if (!updated) {
    return notFound("SERVICE_NOT_FOUND", "Service not found.");
  }
  await logAudit({
    actor: auth.phone,
    action: "catalog.service.reorder",
    entity: "service_item",
    entityId: updated.id,
    metadata: { sortOrder: updated.sortOrder },
    shopId: auth.shopId!
  });

  return ok({ service: updated });
}
