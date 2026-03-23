import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { logAudit } from "@/lib/admin/audit";
import { BookingsRepo, JobCardsRepo } from "@/src/lib/store";
import { assertBookingTransition, assertJobCardTransition, isJobCardAmendLocked } from "@/src/lib/workshop/statuses";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { ok, badRequest, notFound, conflict } from "@/lib/api/responses";

const schema = z.object({
  reason: z.string().optional()
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_CANCEL_PAYLOAD", "Invalid cancel payload.");
  }

  const { id } = context.params;
  const booking = await BookingsRepo.get(id);
  if (!booking || booking.shopId !== auth.shopId) {
    return notFound("BOOKING_NOT_FOUND", "Booking not found.");
  }

  if (booking.status === "COMPLETED") {
    return conflict("BOOKING_COMPLETED", "Completed bookings cannot be cancelled.");
  }
  if (booking.status === "CANCELLED") {
    return ok({ booking });
  }
  const bookingTransition = assertBookingTransition(booking.status, "CANCELLED");
  if (!bookingTransition.ok) {
    return badRequest("INVALID_TRANSITION", bookingTransition.message);
  }
  const cards = await JobCardsRepo.list(booking.shopId);
  const card = cards.find((entry) => entry.bookingId === booking.id) || null;
  if (card && isJobCardAmendLocked(card.status)) {
    return conflict("JOB_ALREADY_STARTED", "Job already started. Contact customer and mechanic.");
  }
  if (card) {
    const transition = assertJobCardTransition(card.status, "CANCELLED");
    if (!transition.ok) {
      return badRequest("INVALID_JOB_CARD_TRANSITION", transition.message);
    }
  }

  const updated = await BookingsRepo.update(booking.id, {
    status: "CANCELLED",
    cancelReason: parsed.data.reason,
    amendedAtIso: new Date().toISOString()
  });
  if (!updated) {
    return notFound("BOOKING_NOT_FOUND", "Booking not found.");
  }

  await logAudit({
    actor: auth.phone,
    action: "booking.cancel",
    entity: "booking",
    entityId: updated.id,
    metadata: { reason: parsed.data.reason || null },
    shopId: auth.shopId!
  });
  const updatedCard = card ? await JobCardsRepo.updateStatus(card.id, "CANCELLED") : null;
  await logNotificationEvent({
    eventType: "booking.cancelled",
    channel: "SYSTEM_STUB",
    message: `Booking ${updated.ref} was cancelled by shop.`,
    bookingId: updated.id,
    bookingRef: updated.ref,
    jobCardId: updatedCard?.id,
    jobCardRef: updatedCard?.ref,
    customerPhone: updated.customerPhone,
    metadata: { reason: parsed.data.reason || null }
  });
  await dispatchNotification("BOOKING_CANCELLED", {
    bookingId: updated.id,
    jobCardId: updatedCard?.id,
    actorProfileId: auth.phone,
  });

  return ok({ booking: updated, jobCard: updatedCard });
}
