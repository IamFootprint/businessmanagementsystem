import { requireAdmin } from "@/lib/admin/guard";
import { notFound, ok } from "@/lib/api/responses";
import { ProfilesRepo } from "@/src/lib/store";
import { logAudit } from "@/lib/admin/audit";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";

export async function POST(_req: Request, context: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const updated = await ProfilesRepo.setStatus(context.params.id, "ACTIVE");
  if (!updated) {
    return notFound("MECHANIC_NOT_FOUND", "We could not find that mechanic.");
  }
  await logAudit({
    actor: auth.phone,
    action: "mechanic.activated",
    entity: "profile",
    entityId: updated.id,
    metadata: {
      actionLabel: "Activated mechanic",
      actorPhone: auth.phone,
      targetDisplay: `${updated.name || updated.phone} (${updated.phone})`,
      diffSummary: [`Status: INACTIVE -> ACTIVE`]
    },
    shopId: auth.shopId!
  });
  await logNotificationEvent({
    eventType: "mechanic.activated",
    channel: "SYSTEM_STUB",
    message: `Mechanic ${updated.name || updated.phone} activated.`,
    target: updated.phone,
    metadata: { mechanicId: updated.id }
  });
  return ok({ mechanic: updated });
}
