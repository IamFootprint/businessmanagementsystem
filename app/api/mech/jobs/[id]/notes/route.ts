import { z } from "zod";
import { badRequestFromZod, conflict, forbidden, notFound, ok } from "@/lib/api/responses";
import { requireRole } from "@/src/lib/auth/localSession";
import { JobCardsRepo, getJobCard } from "@/src/lib/store";
import { logAuditEvent } from "@/lib/audit/service";
import { resolveActorFromSession } from "@/lib/audit/resolveActor";

const schema = z.object({
  text: z.string().min(1)
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_NOTE_PAYLOAD",
      "The note cannot be saved yet.",
      parsed.error,
      "Enter a short note before saving."
    );
  }

  const card = await getJobCard(context.params.id);
  if (!card) {
    return notFound("JOB_CARD_NOT_FOUND", "We could not find that job card.");
  }
  if (auth.profile.role === "MECHANIC" && card.assignedMechanicId !== auth.profile.id) {
    return forbidden("FORBIDDEN", "This job card is not assigned to you.");
  }
  if (card.completion?.completedAtIso) {
    return conflict("JOB_CARD_LOCKED", "This job card has already been completed.");
  }

  const updated = await JobCardsRepo.addNote(card.id, {
    id: `note_${Date.now()}`,
    atIso: new Date().toISOString(),
    authorProfileId: auth.profile.id,
    text: parsed.data.text
  });
  if (!updated) {
    return notFound("JOB_CARD_NOT_FOUND", "We could not find that job card.");
  }

  await logAuditEvent({
    eventName: "job_card.note.added",
    eventCategory: "job_card",
    action: "add_note",
    actor: resolveActorFromSession(auth.profile),
    target: {
      type: "job_card",
      id: updated.id,
      display: updated.ref
    },
    contextJson: {
      noteLength: parsed.data.text.length
    },
    shopId: updated.shopId
  }, req);

  return ok({ jobCard: updated });
}
