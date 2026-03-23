import { forbidden, notFound, ok } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/service";
import { resolveActorFromSession } from "@/lib/audit/resolveActor";
import { JobPhotosRepo } from "@/lib/planned-events/store";
import { canAccessJobCard, requireRole } from "@/src/lib/auth/localSession";
import { getJobCard } from "@/src/lib/store";

export async function DELETE(
  request: Request,
  context: { params: { id: string; photoId: string } }
) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  const card = await getJobCard(context.params.id);
  if (!card) {
    return notFound("JOB_CARD_NOT_FOUND", "We could not find that job card.");
  }
  const allowed = await canAccessJobCard(auth.profile, card);
  if (!allowed) {
    return forbidden("FORBIDDEN", "This job card is not assigned to you.");
  }

  const removed = await JobPhotosRepo.remove(card.id, context.params.photoId);
  if (!removed) {
    return notFound("JOB_PHOTO_NOT_FOUND", "Job photo not found.");
  }

  await logAuditEvent({
    eventName: "job_card.photo.deleted",
    eventCategory: "job_card",
    action: "delete_photo",
    actor: resolveActorFromSession(auth.profile),
    target: {
      type: "job_card",
      id: card.id,
      display: card.ref
    },
    beforeJson: {
      photoId: removed.id,
      caption: removed.caption || null,
      mediaUrl: removed.mediaUrl || null
    },
    contextJson: {
      removedByProfileId: auth.profile.id
    },
    shopId: card.shopId
  }, request);

  return ok({ ok: true });
}
