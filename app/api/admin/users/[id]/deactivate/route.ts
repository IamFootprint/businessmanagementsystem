import { requireAdmin } from "@/lib/admin/guard";
import { forbidden, notFound, ok } from "@/lib/api/responses";
import { ProfilesRepo } from "@/src/lib/store";
import { logAudit } from "@/lib/admin/audit";
import { getScopedTarget, mapProfileForResponse, resolveProfileRole } from "../../shared";

export async function POST(_req: Request, context: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const scoped = await getScopedTarget(auth, context.params.id);
  if (scoped.response) return scoped.response;
  const current = scoped.target;
  if (!current) return notFound("USER_NOT_FOUND", "We could not find that user.");
  if (current.id === auth.profileId) {
    return forbidden("FORBIDDEN", "Not allowed.");
  }

  const updated = await ProfilesRepo.setStatus(context.params.id, "INACTIVE");
  if (!updated) {
    return notFound("USER_NOT_FOUND", "We could not find that user.");
  }

  await logAudit({
    actor: auth.phone,
    action: "user.deactivate",
    entity: "profile",
    entityId: updated.id,
    metadata: {
      actionLabel: "Deactivated user",
      actorPhone: auth.phone,
      targetDisplay: `${updated.name || updated.phone} (${updated.phone})`,
      diffSummary: [
        `Status: ${current.status} -> ${updated.status}`,
        `Role: ${resolveProfileRole(updated)}`
      ]
    },
    shopId: auth.shopId!
  });

  return ok({ user: mapProfileForResponse(updated) });
}
