import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { logAudit } from "@/lib/admin/audit";
import { BookingsRepo, JobCardsRepo } from "@/src/lib/store";
import { getSchedulingPolicy, isSlotOutsideNoticeWindow, pickAssignedMechanic } from "@/src/lib/workshop/scheduling";
import { isJobCardAmendLocked } from "@/src/lib/workshop/statuses";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { ok, badRequest, notFound, conflict } from "@/lib/api/responses";

const schema = z.object({
  slotStart: z.string().datetime(),
  allowSameDayOverride: z.boolean().optional(),
  reasonText: z.string().trim().min(3).max(500).optional()
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_RESCHEDULE_PAYLOAD", "Invalid reschedule payload.");
  }

  const { id } = context.params;
  const booking = await BookingsRepo.get(id);
  if (!booking || booking.shopId !== auth.shopId) {
    return notFound("BOOKING_NOT_FOUND", "Booking not found.");
  }
  if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
    return conflict("BOOKING_NOT_RESCHEDULABLE", "Booking cannot be rescheduled in current state.");
  }
  const policy = await getSchedulingPolicy(booking.shopId);
  const isInsideNotice = !isSlotOutsideNoticeWindow(parsed.data.slotStart, policy.defaultNoticeHours);
  if (isInsideNotice && !parsed.data.allowSameDayOverride) {
    return conflict("INSUFFICIENT_NOTICE", `Reschedule requires ${policy.defaultNoticeHours}h notice.`);
  }
  if (isInsideNotice && parsed.data.allowSameDayOverride && !parsed.data.reasonText) {
    return badRequest(
      "REASON_REQUIRED",
      "Provide a reason for same-day override.",
      "This override requires an accountability note."
    );
  }
  const cards = await JobCardsRepo.list(booking.shopId);
  const card = cards.find((entry) => entry.bookingId === booking.id) || null;
  if (card && isJobCardAmendLocked(card.status)) {
    return conflict("JOB_ALREADY_STARTED", "Job already started. Contact customer and mechanic.");
  }

  const updated = await BookingsRepo.update(booking.id, {
    slotIso: parsed.data.slotStart,
    amendedAtIso: new Date().toISOString()
  });
  if (!updated) {
    return notFound("BOOKING_NOT_FOUND", "Booking not found.");
  }
  let updatedCard = card;
  if (card) {
    updatedCard = await JobCardsRepo.reschedule(card.id, parsed.data.slotStart);
    const assignment = await pickAssignedMechanic({
      shopId: updated.shopId,
      preferredMechanicId: updated.preferredMechanicId
    });
    if (assignment.mechanic?.id !== card.assignedMechanicId) {
      updatedCard = await JobCardsRepo.reassignMechanic(card.id, assignment.mechanic?.id ?? null);
    }
  }

  await logAudit({
    actor: auth.phone,
    action: "booking.reschedule",
    entity: "booking",
    entityId: updated.id,
    metadata: {
      slotIso: updated.slotIso,
      overrideApplied: Boolean(isInsideNotice && parsed.data.allowSameDayOverride),
      reasonText: parsed.data.reasonText || null
    },
    shopId: auth.shopId!
  });
  if (isInsideNotice && parsed.data.allowSameDayOverride) {
    await logAudit({
      actor: auth.phone,
      action: "booking.same_day_override.applied",
      entity: "booking",
      entityId: updated.id,
      metadata: {
        bookingRef: updated.ref,
        slotIso: updated.slotIso,
        reasonText: parsed.data.reasonText
      },
      shopId: auth.shopId!
    });
  }
  await logNotificationEvent({
    eventType: "booking.rescheduled",
    channel: "SYSTEM_STUB",
    message: `Booking ${updated.ref} was rescheduled by shop.`,
    bookingId: updated.id,
    bookingRef: updated.ref,
    jobCardId: updatedCard?.id,
    jobCardRef: updatedCard?.ref,
    customerPhone: updated.customerPhone,
    metadata: {
      overrideApplied: Boolean(isInsideNotice && parsed.data.allowSameDayOverride),
      reasonText: parsed.data.reasonText || null
    }
  });
  await dispatchNotification("BOOKING_RESCHEDULED", {
    bookingId: updated.id,
    jobCardId: updatedCard?.id,
    actorProfileId: auth.phone,
  });

  return ok({ booking: updated, jobCard: updatedCard });
}
