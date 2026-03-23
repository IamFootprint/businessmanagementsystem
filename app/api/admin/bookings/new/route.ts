import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { resolveBookingTarget } from "@/lib/bookings/target";
import { BookingsRepo, JobCardsRepo, ProfilesRepo } from "@/src/lib/store";
import { getSchedulingPolicy, isSlotOutsideNoticeWindow, pickAssignedMechanic } from "@/src/lib/workshop/scheduling";
import { logAudit } from "@/lib/admin/audit";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { resolveWorkshopRole } from "@/src/lib/auth/roles";
import { ok, badRequest, notFound } from "@/lib/api/responses";

const schema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  customerBikeId: z.string().optional(),
  preferredMechanicId: z.string().optional(),
  serviceItemId: z.string().optional(),
  itemId: z.string().optional(),
  itemType: z.enum(["service", "package"]).optional(),
  addressLine1: z.string().min(3),
  suburb: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  slotIso: z.string().datetime()
});

function isSlotValid(slotIso: string) {
  const slot = new Date(slotIso);
  return slot.getTime() > Date.now();
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_BOOKING_PAYLOAD", "Invalid booking payload.");
  }
  if (!isSlotValid(parsed.data.slotIso)) {
    return badRequest("INVALID_SLOT", "Invalid slot.");
  }

  const itemId = parsed.data.serviceItemId || parsed.data.itemId;
  if (!itemId) {
    return badRequest("ITEM_REQUIRED", "Service or package selection is required.");
  }
  const itemType = parsed.data.itemType || "service";
  const target = await resolveBookingTarget(itemId, itemType);
  if (!target) {
    return notFound("ITEM_NOT_FOUND", itemType === "package" ? "Package not available." : "Service not available.");
  }

  const existingProfile = await ProfilesRepo.getByPhone(parsed.data.customerPhone);
  if (!existingProfile) {
    return notFound("CLIENT_NOT_FOUND", "Client profile not found. Register the client first.");
  }
  const customerProfile = await ProfilesRepo.upsertByPhone({
    phone: parsed.data.customerPhone,
    name: parsed.data.customerName,
    role: existingProfile.role,
    status: existingProfile.status || "ACTIVE",
    shopId: auth.shopId!
  });
  const policy = await getSchedulingPolicy(auth.shopId!);
  if (!isSlotOutsideNoticeWindow(parsed.data.slotIso, policy.defaultNoticeHours)) {
    return badRequest("INSUFFICIENT_NOTICE", `Slot must be at least ${policy.defaultNoticeHours}h ahead.`);
  }

  const createdByRole = resolveWorkshopRole({
    role: "ADMIN",
    phone: auth.phone
  });

  const booking = await BookingsRepo.create({
    customerProfileId: customerProfile.id,
    customerBikeId: parsed.data.customerBikeId,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    serviceItemId: target.serviceItemId,
    selectedPackageId: target.selectedPackageId,
    preferredMechanicId: parsed.data.preferredMechanicId,
    createdByRole,
    createdByProfileId: auth.profileId,
    serviceNameSnapshot: target.name,
    addressLine1: parsed.data.addressLine1,
    suburb: parsed.data.suburb,
    city: parsed.data.city,
    notes: parsed.data.notes,
    slotIso: parsed.data.slotIso,
    status: "CONFIRMED",
    shopId: auth.shopId!
  });

  const assignment = await pickAssignedMechanic({
    shopId: auth.shopId!,
    preferredMechanicId: parsed.data.preferredMechanicId
  });
  const jobCard = await JobCardsRepo.createFromBooking(
    booking,
    { id: target.serviceItemId ?? null, durationMins: target.durationMinutes },
    assignment.mechanic?.id ?? null
  );
  await logAudit({
    actor: auth.phone,
    action: "booking.create_on_behalf",
    entity: "booking",
    entityId: booking.id,
    metadata: {
      bookingRef: booking.ref,
      createdByRole: booking.createdByRole,
      assignmentReason: assignment.reason
    },
    shopId: auth.shopId!
  });
  await logNotificationEvent({
    eventType: "booking.confirmed",
    channel: "SYSTEM_STUB",
    message: `Booking ${booking.ref} confirmed.`,
    bookingId: booking.id,
    bookingRef: booking.ref,
    jobCardId: jobCard.id,
    jobCardRef: jobCard.ref,
    customerPhone: booking.customerPhone,
    metadata: {
      createdByRole: booking.createdByRole,
      assignmentReason: assignment.reason
    }
  });
  await dispatchNotification("BOOKING_CONFIRMED", {
    bookingId: booking.id,
    actorProfileId: auth.profileId,
  });

  return ok({
    booking,
    jobCard,
    assignmentWarning: assignment.mechanic ? null : "No active mechanic available. Job card is currently unassigned."
  });
}
