import { z } from "zod";
import { requireRole } from "@/src/lib/auth/localSession";
import { resolveBookingTarget } from "@/lib/bookings/target";
import {
  BookingsRepo,
  JobCardsRepo,
  ProfilesRepo
} from "@/src/lib/store";
import { getSchedulingPolicy, isSlotOutsideNoticeWindow, pickAssignedMechanic } from "@/src/lib/workshop/scheduling";
import { logAudit } from "@/lib/admin/audit";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";
import { ok, badRequest, notFound, forbidden } from "@/lib/api/responses";

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
  const min = Date.now() + 24 * 60 * 60 * 1000;
  return slot.getTime() >= min;
}

export async function POST(req: Request) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  if (auth.profile.role !== "MECHANIC") {
    return forbidden("FORBIDDEN", "Mechanic access required.");
  }

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_INPUT", "Invalid booking payload.");
  }
  if (!isSlotValid(parsed.data.slotIso)) {
    return badRequest("INVALID_SLOT", "Slot must be at least 24h ahead.");
  }

  const itemId = parsed.data.serviceItemId || parsed.data.itemId;
  if (!itemId) {
    return badRequest("INVALID_INPUT", "Service or package selection is required.");
  }
  const itemType = parsed.data.itemType || "service";
  const target = await resolveBookingTarget(itemId, itemType);
  if (!target) {
    return notFound("NOT_FOUND", itemType === "package" ? "Package not available." : "Service not available.");
  }

  const existingProfile = await ProfilesRepo.getByPhone(parsed.data.customerPhone);
  if (!existingProfile) {
    return notFound("NOT_FOUND", "Client profile not found. Register client first.");
  }
  const customerProfile = await ProfilesRepo.upsertByPhone({
    phone: parsed.data.customerPhone,
    name: parsed.data.customerName,
    role: existingProfile.role,
    status: existingProfile.status || "ACTIVE",
    shopId: auth.profile.shopId
  });
  const policy = await getSchedulingPolicy(auth.profile.shopId);
  if (!isSlotOutsideNoticeWindow(parsed.data.slotIso, policy.defaultNoticeHours)) {
    return badRequest("INVALID_SLOT", `Slot must be at least ${policy.defaultNoticeHours}h ahead.`);
  }

  const booking = await BookingsRepo.create({
    shopId: auth.profile.shopId,
    customerProfileId: customerProfile.id,
    customerBikeId: parsed.data.customerBikeId,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    serviceItemId: target.serviceItemId,
    selectedPackageId: target.selectedPackageId,
    preferredMechanicId: parsed.data.preferredMechanicId,
    createdByRole: "MECHANIC",
    createdByProfileId: auth.profile.id,
    serviceNameSnapshot: target.name,
    addressLine1: parsed.data.addressLine1,
    suburb: parsed.data.suburb,
    city: parsed.data.city,
    notes: parsed.data.notes,
    slotIso: parsed.data.slotIso,
    status: "CONFIRMED"
  });

  const assignment = await pickAssignedMechanic({
    shopId: auth.profile.shopId,
    preferredMechanicId: parsed.data.preferredMechanicId || auth.profile.id
  });
  const jobCard = await JobCardsRepo.createFromBooking(
    booking,
    { id: target.serviceItemId ?? null, durationMins: target.durationMinutes },
    assignment.mechanic?.id ?? auth.profile.id
  );
  await logAudit({
    actor: auth.profile.phone,
    action: "booking.create_on_behalf",
    entity: "booking",
    entityId: booking.id,
    metadata: {
      bookingRef: booking.ref,
      createdByRole: booking.createdByRole,
      assignmentReason: assignment.reason
    },
    shopId: booking.shopId
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
    actorProfileId: auth.profile.id,
    metadata: {
      createdByRole: booking.createdByRole,
      assignmentReason: assignment.reason
    }
  });
  return ok({ booking, jobCard });
}
