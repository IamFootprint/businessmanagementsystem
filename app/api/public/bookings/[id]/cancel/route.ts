import { z } from "zod";
import { badRequestFromZod, conflict, forbidden, notFound, ok } from "@/lib/api/responses";
import { BookingsRepo, JobCardsRepo } from "@/src/lib/store";
import { canAccessBooking, requireRole } from "@/src/lib/auth/localSession";
import { getSchedulingPolicy, isSlotOutsideNoticeWindow } from "@/src/lib/workshop/scheduling";
import { assertBookingTransition, assertJobCardTransition, isJobCardAmendLocked } from "@/src/lib/workshop/statuses";
import { logAudit } from "@/lib/admin/audit";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";

const schema = z.object({
  reason: z.string().optional()
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["CLIENT", "SHOP_OWNER", "PLATFORM_OWNER"]);
  if (!auth.ok) return auth.response!;

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod("INVALID_CANCEL_REQUEST", "The cancellation request is invalid.", parsed.error);
  }

  const booking = await BookingsRepo.get(context.params.id);
  if (!booking) {
    return notFound("BOOKING_NOT_FOUND", "We could not find that booking.");
  }
  const allowed = await canAccessBooking(auth.profile, booking);
  if (!allowed) {
    return forbidden("FORBIDDEN", "You do not have access to this booking.");
  }
  if (booking.status !== "CONFIRMED") {
    return conflict("INVALID_STATE", "This booking can no longer be cancelled online.");
  }

  const policy = await getSchedulingPolicy(booking.shopId);
  if (!isSlotOutsideNoticeWindow(booking.slotIso, policy.defaultNoticeHours)) {
    return conflict(
      "TOO_LATE",
      `Cancellation requires ${policy.defaultNoticeHours}h notice.`,
      "Contact the shop directly if the booking is urgent."
    );
  }

  const cards = await JobCardsRepo.list(booking.shopId);
  const card = cards.find((entry) => entry.bookingId === booking.id) || null;
  if (card && isJobCardAmendLocked(card.status)) {
    return conflict(
      "JOB_ALREADY_STARTED",
      "This booking is already in progress.",
      "Contact the shop directly for help with changes."
    );
  }

  const bookingTransition = assertBookingTransition(booking.status, "CANCELLED");
  if (!bookingTransition.ok) {
    return conflict("INVALID_TRANSITION", bookingTransition.message);
  }

  if (card) {
    const transition = assertJobCardTransition(card.status, "CANCELLED");
    if (!transition.ok) {
      return conflict("INVALID_TRANSITION", transition.message);
    }
  }

  const updated = await BookingsRepo.update(booking.id, {
    status: "CANCELLED",
    cancelReason: parsed.data.reason,
    amendedAtIso: new Date().toISOString()
  });
  if (!updated) {
    return notFound("BOOKING_NOT_FOUND", "We could not find that booking.");
  }
  const updatedCard = card ? await JobCardsRepo.updateStatus(card.id, "CANCELLED") : null;

  await logAudit({
    actor: auth.profile.phone,
    action: "booking.cancel",
    entity: "booking",
    entityId: updated.id,
    metadata: {
      bookingRef: updated.ref,
      reason: parsed.data.reason || null
    },
    shopId: updated.shopId
  });
  await logNotificationEvent({
    eventType: "booking.cancelled",
    channel: "SYSTEM_STUB",
    message: `Booking ${updated.ref} was cancelled.`,
    target: updated.customerPhone,
    bookingId: updated.id,
    bookingRef: updated.ref,
    jobCardId: updatedCard?.id,
    jobCardRef: updatedCard?.ref,
    customerPhone: updated.customerPhone,
    actorProfileId: auth.profile.id,
    metadata: { reason: parsed.data.reason || null }
  });
  await dispatchNotification("BOOKING_CANCELLED", {
    bookingId: updated.id,
    jobCardId: updatedCard?.id,
    actorProfileId: auth.profile.id,
  });

  return ok({ booking: updated, jobCard: updatedCard });
}
