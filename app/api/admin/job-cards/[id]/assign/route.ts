import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { BookingsRepo, JobCardsRepo, ProfilesRepo } from "@/src/lib/store";
import { logAudit } from "@/lib/admin/audit";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";
import { ok, badRequest, notFound } from "@/lib/api/responses";

const schema = z.object({
  mechanicId: z.string().nullable()
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_MECHANIC_ASSIGNMENT_PAYLOAD", "Invalid mechanic assignment payload.");
  }

  const card = await JobCardsRepo.get(context.params.id);
  if (!card || card.shopId !== auth.shopId) {
    return notFound("JOB_CARD_NOT_FOUND", "Job card not found.");
  }
  if (parsed.data.mechanicId) {
    const mechanic = await ProfilesRepo.getById(parsed.data.mechanicId);
    if (!mechanic || mechanic.role !== "MECHANIC" || mechanic.status !== "ACTIVE") {
      return badRequest("MECHANIC_NOT_AVAILABLE", "Mechanic not available for assignment.");
    }
  }

  const updatedCard = await JobCardsRepo.reassignMechanic(card.id, parsed.data.mechanicId);
  if (!updatedCard) {
    return notFound("JOB_CARD_NOT_FOUND", "Job card not found.");
  }
  const booking = await BookingsRepo.get(card.bookingId);
  if (booking) {
    await BookingsRepo.update(booking.id, {
      preferredMechanicId: parsed.data.mechanicId || undefined
    });
  }

  await logAudit({
    actor: auth.phone,
    action: "job_card.assign_mechanic",
    entity: "job_card",
    entityId: updatedCard.id,
    metadata: {
      jobCardRef: updatedCard.ref,
      assignedMechanicId: parsed.data.mechanicId
    },
    shopId: auth.shopId!
  });
  await logNotificationEvent({
    eventType: "job_card.assigned",
    channel: "SYSTEM_STUB",
    message: `Job card ${updatedCard.ref} assignment updated.`,
    bookingId: updatedCard.bookingId,
    bookingRef: updatedCard.bookingRef,
    jobCardId: updatedCard.id,
    jobCardRef: updatedCard.ref,
    customerPhone: updatedCard.customerPhone,
    metadata: { assignedMechanicId: parsed.data.mechanicId }
  });

  return ok({ jobCard: updatedCard });
}
