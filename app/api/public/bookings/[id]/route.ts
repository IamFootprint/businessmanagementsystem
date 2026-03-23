import { BookingsRepo, JobCardsRepo } from "@/src/lib/store";
import { forbidden, notFound, ok } from "@/lib/api/responses";
import { canAccessBooking, requireRole } from "@/src/lib/auth/localSession";

export async function GET(_request: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["CLIENT", "SHOP_OWNER", "PLATFORM_OWNER"]);
  if (!auth.ok) return auth.response!;

  const booking = await BookingsRepo.get(context.params.id);
  if (!booking) {
    return notFound("BOOKING_NOT_FOUND", "We could not find that booking.");
  }
  const allowed = await canAccessBooking(auth.profile, booking);
  if (!allowed) {
    return forbidden("FORBIDDEN", "You do not have access to this booking.");
  }
  const allCards = await JobCardsRepo.list(booking.shopId);
  const jobCard = allCards.find((card) => card.bookingId === booking.id) || null;
  const pendingExtras = (jobCard?.additionalCharges || []).filter(
    (charge) => charge.approvalStatus === "PENDING"
  );

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
    jobCard: jobCard
      ? {
          id: jobCard.id,
          ref: jobCard.ref,
          status: jobCard.status
        }
      : null,
    pendingExtras
  });
}
