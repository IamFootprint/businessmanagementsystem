import { z } from "zod";
import { badRequestFromZod, conflict, forbidden, notFound, ok } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/service";
import { resolveActorFromSession } from "@/lib/audit/resolveActor";
import { JobPhotosRepo } from "@/lib/planned-events/store";
import { canAccessJobCard, requireRole } from "@/src/lib/auth/localSession";
import { getJobCard } from "@/src/lib/store";

const createSchema = z.object({
  caption: z.string().trim().min(1).max(240).optional(),
  mediaUrl: z.string().url().max(2000).optional()
});

export async function GET(_request: Request, context: { params: { id: string } }) {
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

  const photos = await JobPhotosRepo.listByJobCard(card.id);
  return ok({ photos });
}

export async function POST(request: Request, context: { params: { id: string } }) {
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
  if (card.completion?.completedAtIso) {
    return conflict("JOB_CARD_LOCKED", "This job card has already been completed.");
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_JOB_PHOTO_PAYLOAD",
      "Invalid job photo payload.",
      parsed.error
    );
  }

  const photo = await JobPhotosRepo.create({
    jobCardId: card.id,
    shopId: card.shopId,
    addedByProfileId: auth.profile.id,
    caption: parsed.data.caption,
    mediaUrl: parsed.data.mediaUrl
  });

  await logAuditEvent({
    eventName: "job_card.photo.added",
    eventCategory: "job_card",
    action: "add_photo",
    actor: resolveActorFromSession(auth.profile),
    target: {
      type: "job_card",
      id: card.id,
      display: card.ref
    },
    afterJson: {
      photoId: photo.id,
      caption: photo.caption || null,
      mediaUrl: photo.mediaUrl || null
    },
    contextJson: {
      addedByProfileId: photo.addedByProfileId
    },
    shopId: card.shopId
  }, request);

  return ok({ photo });
}
