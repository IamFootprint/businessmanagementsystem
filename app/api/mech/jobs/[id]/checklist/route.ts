import { z } from "zod";
import { badRequestFromZod, conflict, forbidden, notFound, ok } from "@/lib/api/responses";
import { requireRole } from "@/src/lib/auth/localSession";
import { getJobCard, JobCardsRepo } from "@/src/lib/store";

const checklistSchema = z.object({
  intakeDone: z.boolean(),
  washDone: z.boolean(),
  drivetrain: z.boolean(),
  brakes: z.boolean(),
  wheels: z.boolean(),
  suspension: z.boolean(),
  torqueCheck: z.boolean(),
  testRide: z.boolean()
});

const partsSchema = z.array(
  z.object({
    name: z.string().min(1),
    qty: z.number().min(1),
    unitPriceCents: z.number().optional()
  })
);

const schema = z.object({
  checklist: checklistSchema,
  partsUsed: partsSchema.optional()
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_CHECKLIST_PAYLOAD",
      "Some checklist values are invalid.",
      parsed.error
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

    if (parsed.data.partsUsed) {
      for (const part of parsed.data.partsUsed) {
        await JobCardsRepo.addPart(card.id, {
          id: `part_${Date.now()}`,
          name: part.name,
          qty: part.qty,
          unitPriceCents: part.unitPriceCents
        });
      }
    }
  const updated = await JobCardsRepo.updateChecklist(card.id, parsed.data.checklist);
  if (!updated) {
    return notFound("JOB_CARD_NOT_FOUND", "We could not find that job card.");
  }

  return ok({ jobCard: updated });
}
