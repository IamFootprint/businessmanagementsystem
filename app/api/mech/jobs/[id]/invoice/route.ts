import { requireRole } from "@/src/lib/auth/localSession";
import { InvoicesRepo, getJobCard } from "@/src/lib/store";
import { ok, notFound, forbidden } from "@/lib/api/responses";

export async function GET(_req: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  const card = await getJobCard(context.params.id);
  if (!card) {
    return notFound("NOT_FOUND", "Job card not found.");
  }
  if (auth.profile.role === "MECHANIC" && card.assignedMechanicId !== auth.profile.id) {
    return forbidden("FORBIDDEN", "Job card not assigned.");
  }

  const invoice = await InvoicesRepo.getByJobCardId(card.id);
  if (!invoice) {
    return notFound("NOT_FOUND", "Invoice not issued yet.");
  }

  return ok({ invoice });
}
