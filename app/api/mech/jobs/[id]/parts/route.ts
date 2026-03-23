import { z } from "zod";
import { requireRole } from "@/src/lib/auth/localSession";
import { getJobCard, JobCardsRepo } from "@/src/lib/store";
import { ok, badRequest, notFound, forbidden, conflict } from "@/lib/api/responses";

const schema = z.object({
  inventoryItemId: z.string().optional(),
  location: z.string().min(1).optional(),
  name: z.string().min(1),
  brand: z.string().min(1).optional(),
  qty: z.number().min(1),
  unitPriceCents: z.number().optional()
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_INPUT", "Invalid part.");
  }

  const card = await getJobCard(context.params.id);
  if (!card) {
    return notFound("NOT_FOUND", "Job card not found.");
  }
  if (auth.profile.role === "MECHANIC" && card.assignedMechanicId !== auth.profile.id) {
    return forbidden("FORBIDDEN", "Job card not assigned.");
  }
  if (card.completion) {
    return conflict("LOCKED", "Job card already completed.");
  }

  const updated = await JobCardsRepo.addPart(card.id, {
    id: `part_${Date.now()}`,
    ...parsed.data
  });
  return ok({ jobCard: updated });
}
