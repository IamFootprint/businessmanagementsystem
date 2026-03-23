import { forbidden, notFound, ok } from "@/lib/api/responses";
import { canAccessJobCard, requireRole } from "@/src/lib/auth/localSession";
import { getJobCard } from "@/src/lib/store";

export async function GET(_req: Request, context: { params: { id: string } }) {
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

  return ok({ jobCard: card });
}
