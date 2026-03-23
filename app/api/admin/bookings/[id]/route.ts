import { requireAdmin } from "@/lib/admin/guard";
import { BookingsRepo, JobCardsRepo, ProfilesRepo } from "@/src/lib/store";
import { ok, notFound } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/service";
import { resolveActorFromAdmin } from "@/lib/audit/resolveActor";

export async function GET(_req: Request, context: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const { id } = context.params;
  const booking = await BookingsRepo.get(id);
  if (!booking || booking.shopId !== auth.shopId) {
    return notFound("BOOKING_NOT_FOUND", "Booking not found.");
  }
  const cards = await JobCardsRepo.list(booking.shopId);
  const jobCard = cards.find((entry) => entry.bookingId === booking.id) || null;
  const mechanics = await ProfilesRepo.listMechanics(booking.shopId);
  const assignedMechanic = jobCard?.assignedMechanicId
    ? mechanics.find((entry) => entry.id === jobCard.assignedMechanicId) || null
    : null;

  await logAuditEvent({
    eventName: "admin.sensitive_record.viewed",
    eventCategory: "security",
    action: "view",
    actor: resolveActorFromAdmin(auth),
    target: {
      type: "booking",
      id: booking.id,
      display: booking.ref
    },
    reasonCode: "SUPPORT_INVESTIGATION",
    contextJson: {
      route: "/api/admin/bookings/[id]",
      includesCustomerPhone: true
    },
    shopId: auth.shopId || null,
    isSensitive: true,
    retentionClass: "security"
  }, _req);

  return ok({
    id: booking.id,
    referenceCode: booking.ref,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    addressText: booking.addressLine1,
    notes: booking.notes || null,
    status: booking.status,
    itemType: booking.selectedPackageId ? "package" : "service",
    itemName: booking.serviceNameSnapshot,
    scheduledStartAt: booking.slotIso,
    timeZone: "Africa/Johannesburg",
    preferredMechanicId: booking.preferredMechanicId || null,
    mechanics: mechanics.map((mechanic) => ({
      id: mechanic.id,
      name: mechanic.name,
      phone: mechanic.phone,
      status: mechanic.status
    })),
    jobCard: jobCard
      ? {
          id: jobCard.id,
          ref: jobCard.ref,
          status: jobCard.status,
          assignedMechanicId: jobCard.assignedMechanicId || null,
          assignedMechanicName: assignedMechanic?.name || null
        }
      : null
  });
}
