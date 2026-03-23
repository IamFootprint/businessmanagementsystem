import { z } from "zod";
import { BookingsRepo, JobCardsRepo } from "@/src/lib/store";
import { canAccessBooking, requireRole } from "@/src/lib/auth/localSession";
import { assertJobCardTransition } from "@/src/lib/workshop/statuses";
import { logAudit } from "@/lib/admin/audit";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";
import { ok, badRequest, notFound, forbidden } from "@/lib/api/responses";

const schema = z.object({
  chargeId: z.string().min(1)
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_INPUT", "Invalid extras rejection payload.");
  }

  const booking = await BookingsRepo.get(context.params.id);
  if (!booking) {
    return notFound("NOT_FOUND", "Booking not found.");
  }
  const allowed = await canAccessBooking(auth.profile, booking);
  if (!allowed) {
    return forbidden("FORBIDDEN", "Not allowed.");
  }

  const cards = await JobCardsRepo.list(booking.shopId);
  const card = cards.find((entry) => entry.bookingId === booking.id) || null;
  if (!card) {
    return notFound("NOT_FOUND", "Job card not found.");
  }

  const charge = (card.additionalCharges || []).find((item) => item.id === parsed.data.chargeId);
  if (!charge || charge.approvalStatus !== "PENDING") {
    return notFound("NOT_FOUND", "Pending extra not found.");
  }

  let updatedCard = await JobCardsRepo.decideAdditionalCharge(card.id, charge.id, "REJECTED", auth.profile.id);
  if (!updatedCard) {
    return notFound("NOT_FOUND", "Job card not found.");
  }

  const hasPending = (updatedCard.additionalCharges || []).some((item) => item.approvalStatus === "PENDING");
  if (!hasPending && updatedCard.status === "AWAITING_APPROVAL") {
    const transition = assertJobCardTransition(updatedCard.status, "IN_PROGRESS");
    if (transition.ok) {
      const resumed = await JobCardsRepo.updateStatus(updatedCard.id, "IN_PROGRESS");
      if (resumed) updatedCard = resumed;
    }
  }

  await logAudit({
    actor: auth.profile.phone,
    action: "job_card.extra.rejected",
    entity: "job_card",
    entityId: updatedCard.id,
    metadata: {
      jobCardRef: updatedCard.ref,
      chargeId: charge.id
    },
    shopId: updatedCard.shopId
  });
  await logNotificationEvent({
    eventType: "job_card.extra.rejected",
    channel: "SYSTEM_STUB",
    message: `Client rejected extra charge on ${updatedCard.ref}.`,
    bookingId: updatedCard.bookingId,
    bookingRef: updatedCard.bookingRef,
    jobCardId: updatedCard.id,
    jobCardRef: updatedCard.ref,
    customerPhone: updatedCard.customerPhone,
    actorProfileId: auth.profile.id,
    metadata: { chargeId: charge.id }
  });

  return ok({ booking, jobCard: updatedCard });
}
