import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveBookingTarget } from "@/lib/bookings/target";
import { isKillSwitchActive, KILL_SWITCHES } from "@/src/lib/db/feature-flags";
import { badRequest, badRequestFromZod, created as createdResponse, notFound, ok } from "@/lib/api/responses";
import { pricingSnapshotSchema } from "@/lib/pricing/schema";
import { BookingsRepo, JobCardsRepo, ProfilesRepo } from "@/src/lib/store";
import { getRequestShopId } from "@/lib/shop/requestContext";
import { requireRole } from "@/src/lib/auth/localSession";
import { getSchedulingPolicy, isSlotOutsideNoticeWindow, pickAssignedMechanic } from "@/src/lib/workshop/scheduling";
import { logAudit } from "@/lib/admin/audit";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { processNotificationQueue } from "@/lib/notifications/processor";

const bookingSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  customerBikeId: z.string().optional(),
  serviceItemId: z.string().optional(),
  itemId: z.string().optional(),
  itemType: z.enum(["package", "service"]).optional(),
  preferredMechanicId: z.string().optional(),
  addressLine1: z.string().min(3).optional(),
  addressText: z.string().min(3).optional(),
  suburb: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  slotIso: z.string().datetime().optional(),
  slotStart: z.string().datetime().optional(),
  pricingSnapshot: pricingSnapshotSchema.optional()
});

function isSlotValid(slotIso: string, noticeHours: number) {
  const slot = new Date(slotIso);
  if (Number.isNaN(slot.getTime())) return false;
  return isSlotOutsideNoticeWindow(slotIso, noticeHours);
}

export async function GET() {
  const auth = await requireRole(["CLIENT", "SHOP_OWNER", "PLATFORM_OWNER"]);
  if (!auth.ok) return auth.response!;

  const bookings =
    auth.profile.role === "CLIENT"
      ? await BookingsRepo.listByCustomer(auth.profile.id)
      : await BookingsRepo.list(auth.profile.shopId);

  return ok({ bookings });
}

export async function POST(request: Request) {
  // Kill switch check — must be first
  if (await isKillSwitchActive(KILL_SWITCHES.PUBLIC_BOOKING)) {
    return NextResponse.json({ error: 'Booking is temporarily unavailable' }, { status: 503 })
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bookingSchema.safeParse(json);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_BOOKING_DETAILS",
      "Some booking details are invalid.",
      parsed.error,
      "Check the highlighted fields and try again."
    );
  }

  const data = parsed.data;
  const itemId = data.serviceItemId || data.itemId;
  if (!itemId) {
    return badRequest(
      "ITEM_REQUIRED",
      "Choose a service before confirming your booking.",
      "Return to the booking flow and select a service or package."
    );
  }
  const itemType = data.itemType || "service";

  const target = await resolveBookingTarget(itemId, itemType);
  if (!target) {
    return notFound(
      "BOOKING_TARGET_NOT_FOUND",
      itemType === "package" ? "The selected package is no longer available." : "The selected service is no longer available.",
      "Refresh the service list and choose another option."
    );
  }

  const slotIso = data.slotIso || data.slotStart;
  const shopId = await getRequestShopId();
  const policy = await getSchedulingPolicy(shopId);
  if (!slotIso || !isSlotValid(slotIso, policy.defaultNoticeHours)) {
    return badRequest(
      "INVALID_SLOT",
      `Select a slot at least ${policy.defaultNoticeHours} hours ahead.`,
      "Choose a later time and try again."
    );
  }

  const existingProfile = await ProfilesRepo.getByPhone(data.customerPhone);
  const customerProfile = await ProfilesRepo.upsertByPhone({
    phone: data.customerPhone,
    name: data.customerName,
    role: existingProfile?.role || "CLIENT",
    status: existingProfile?.status || "ACTIVE",
    shopId
  });

  const booking = await BookingsRepo.create({
    customerProfileId: customerProfile.id,
    customerBikeId: data.customerBikeId,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    serviceItemId: target.serviceItemId,
    selectedPackageId: target.selectedPackageId,
    preferredMechanicId: data.preferredMechanicId,
    createdByRole: "CLIENT",
    createdByProfileId: customerProfile.id,
    serviceNameSnapshot: target.name,
    addressLine1: data.addressLine1 || data.addressText || "",
    suburb: data.suburb,
    city: data.city,
    notes: data.notes,
    slotIso,
    status: "CONFIRMED",
    pricingSnapshot: data.pricingSnapshot,
    shopId
  });

  const assignment = await pickAssignedMechanic({
    shopId,
    preferredMechanicId: data.preferredMechanicId
  });
  const jobCard = await JobCardsRepo.createFromBooking(
    booking,
    { id: target.serviceItemId ?? null, durationMins: target.durationMinutes },
    assignment.mechanic?.id ?? null
  );
  await logAudit({
    actor: customerProfile.phone,
    action: "booking.create",
    entity: "booking",
    entityId: booking.id,
    metadata: {
      bookingRef: booking.ref,
      createdByRole: booking.createdByRole,
      assignmentReason: assignment.reason
    },
    shopId
  });
  await logNotificationEvent({
    eventType: "booking.confirmed",
    channel: "SYSTEM_STUB",
    message: `Booking ${booking.ref} confirmed.`,
    target: booking.customerPhone,
    bookingId: booking.id,
    bookingRef: booking.ref,
    jobCardId: jobCard.id,
    jobCardRef: jobCard.ref,
    customerPhone: booking.customerPhone,
    actorProfileId: customerProfile.id,
    metadata: {
      assignmentReason: assignment.reason
    }
  });
  await dispatchNotification("BOOKING_CONFIRMED", {
    bookingId: booking.id,
    actorProfileId: customerProfile.id,
  });

  // Notify the shop owner about the new booking
  const shopProfiles = await ProfilesRepo.list(shopId);
  const shopOwnerProfile = shopProfiles.find((p) => p.role === "SHOP_OWNER");
  if (shopOwnerProfile) {
    await dispatchNotification("BOOKING_CREATED_SHOP_OWNER", {
      bookingId: booking.id,
      recipientProfileId: shopOwnerProfile.id,
      actorProfileId: customerProfile.id,
      extraVars: {
        customerName: booking.customerName,
        serviceName: booking.serviceNameSnapshot,
        address: booking.addressLine1,
      },
    });
  }

  // Process notification queue immediately so messages are sent right away
  await processNotificationQueue().catch(console.error);

  return createdResponse({
    bookingId: booking.id,
    referenceCode: booking.ref,
    status: booking.status,
    jobCardRef: jobCard.ref,
    assignmentWarning:
      assignment.mechanic ? null : "No active mechanic available. Job card is currently unassigned.",
    assignmentMode: assignment.reason,
    summary: {
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      addressText: booking.addressLine1,
      itemName: booking.serviceNameSnapshot,
      scheduledStartAt: booking.slotIso
    }
  });
}
