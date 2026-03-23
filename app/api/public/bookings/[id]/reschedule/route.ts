import { z } from "zod";
import { badRequestFromZod, conflict, forbidden, notFound, ok } from "@/lib/api/responses";
import { BookingsRepo, JobCardsRepo } from "@/src/lib/store";
import { canAccessBooking, requireRole } from "@/src/lib/auth/localSession";
import { getSchedulingPolicy, isSlotOutsideNoticeWindow, pickAssignedMechanic } from "@/src/lib/workshop/scheduling";
import { isJobCardAmendLocked } from "@/src/lib/workshop/statuses";
import { logAudit } from "@/lib/admin/audit";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";

const schema = z.object({
  slotIso: z.string().datetime()
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["CLIENT", "SHOP_OWNER", "PLATFORM_OWNER"]);
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_SLOT",
      "The new booking slot is invalid.",
      parsed.error,
      "Choose a valid future date and time."
    );
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
    return conflict("INVALID_STATE", "This booking can no longer be rescheduled online.");
  }

  const policy = await getSchedulingPolicy(booking.shopId);
  if (
    !isSlotOutsideNoticeWindow(booking.slotIso, policy.defaultNoticeHours) ||
    !isSlotOutsideNoticeWindow(parsed.data.slotIso, policy.defaultNoticeHours)
  ) {
    return conflict(
      "TOO_LATE",
      `Reschedule requires ${policy.defaultNoticeHours}h notice.`,
      "Choose a later booking or contact the shop directly."
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

  const updated = await BookingsRepo.update(booking.id, {
    slotIso: parsed.data.slotIso,
    amendedAtIso: new Date().toISOString()
  });
  if (!updated) {
    return notFound("BOOKING_NOT_FOUND", "We could not find that booking.");
  }

  let updatedCard = card;
  if (card) {
    updatedCard = await JobCardsRepo.reschedule(card.id, parsed.data.slotIso);
    const assignment = await pickAssignedMechanic({
      shopId: updated.shopId,
      preferredMechanicId: updated.preferredMechanicId
    });
    if (assignment.mechanic?.id !== card.assignedMechanicId) {
      updatedCard = await JobCardsRepo.reassignMechanic(card.id, assignment.mechanic?.id ?? null);
    }
  }

  await logAudit({
    actor: auth.profile.phone,
    action: "booking.reschedule",
    entity: "booking",
    entityId: updated.id,
    metadata: {
      bookingRef: updated.ref,
      slotIso: updated.slotIso,
      jobCardId: updatedCard?.id || null
    },
    shopId: updated.shopId
  });
  await logNotificationEvent({
    eventType: "booking.rescheduled",
    channel: "SYSTEM_STUB",
    message: `Booking ${updated.ref} was rescheduled.`,
    target: updated.customerPhone,
    bookingId: updated.id,
    bookingRef: updated.ref,
    jobCardId: updatedCard?.id,
    jobCardRef: updatedCard?.ref,
    customerPhone: updated.customerPhone,
    actorProfileId: auth.profile.id
  });
  await dispatchNotification("BOOKING_RESCHEDULED", {
    bookingId: updated.id,
    jobCardId: updatedCard?.id,
    actorProfileId: auth.profile.id,
  });

  return ok({ booking: updated, jobCard: updatedCard });
}
