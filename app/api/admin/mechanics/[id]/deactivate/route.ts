import { requireAdmin } from "@/lib/admin/guard";
import { notFound, ok } from "@/lib/api/responses";
import { ProfilesRepo } from "@/src/lib/store";
import { logAudit } from "@/lib/admin/audit";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";

export async function POST(_req: Request, context: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const updated = await ProfilesRepo.setStatus(context.params.id, "INACTIVE");
  if (!updated) {
    return notFound("MECHANIC_NOT_FOUND", "We could not find that mechanic.");
  }
  await logAudit({
    actor: auth.phone,
    action: "mechanic.deactivated",
    entity: "profile",
    entityId: updated.id,
    metadata: {
      actionLabel: "Deactivated mechanic",
      actorPhone: auth.phone,
      targetDisplay: `${updated.name || updated.phone} (${updated.phone})`,
      diffSummary: [`Status: ACTIVE -> INACTIVE`]
    },
    shopId: auth.shopId!
  });
  await logNotificationEvent({
    eventType: "mechanic.deactivated",
    channel: "SYSTEM_STUB",
    message: `Mechanic ${updated.name || updated.phone} deactivated.`,
    target: updated.phone,
    metadata: { mechanicId: updated.id }
  });
  return ok({ mechanic: updated });
}
