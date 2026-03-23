import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { badRequestFromZod, notFound, ok } from "@/lib/api/responses";
import { ServiceItemsRepo } from "@/src/lib/store";
import { logAudit } from "@/lib/admin/audit";

const schema = z.object({
  isActive: z.boolean()
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_TOGGLE_PAYLOAD",
      "The service status change request is invalid.",
      parsed.error
    );
  }

  const updated = await ServiceItemsRepo.toggle(context.params.id, parsed.data.isActive);
  if (!updated) {
    return notFound("SERVICE_NOT_FOUND", "We could not find that service.");
  }
  await logAudit({
    actor: auth.phone,
    action: parsed.data.isActive ? "catalog.service.activate" : "catalog.service.deactivate",
    entity: "service_item",
    entityId: updated.id,
    metadata: {
      actionLabel: parsed.data.isActive ? "Activated service" : "Deactivated service",
      actorPhone: auth.phone,
      targetDisplay: updated.name,
      diffSummary: [`Status: ${updated.isActive ? "Active" : "Inactive"}`]
    },
    shopId: auth.shopId!
  });

  return ok({ service: updated });
}
