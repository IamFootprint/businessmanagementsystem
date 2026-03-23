import { canAccessBooking, requireRole } from "@/src/lib/auth/localSession";
import { BookingsRepo } from "@/src/lib/store";
import { forbidden, notFound, ok } from "@/lib/api/responses";

type InvoiceLine = {
  code: string;
  label: string;
  amountCents: number;
};

function fallbackLines(booking: Awaited<ReturnType<typeof BookingsRepo.get>>): InvoiceLine[] {
  if (!booking) return [];
  const total = booking.pricingSnapshot?.totalCents || 0;
  return [
    {
      code: "service_base",
      label: booking.serviceNameSnapshot || "Service",
      amountCents: Math.max(0, total),
    },
  ];
}

export async function GET(_request: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["CLIENT", "SHOP_OWNER", "PLATFORM_OWNER"]);
  if (!auth.ok) return auth.response!;

  const booking = await BookingsRepo.get(context.params.id);
  if (!booking) {
    return notFound("BOOKING_NOT_FOUND", "Booking not found.");
  }

  const allowed = await canAccessBooking(auth.profile, booking);
  if (!allowed) {
    return forbidden("FORBIDDEN", "You do not have access to this booking.");
  }

  const lineItems = booking.pricingSnapshot?.lineItems?.length
    ? booking.pricingSnapshot.lineItems
    : fallbackLines(booking);
  const totalCents = booking.pricingSnapshot?.totalCents || lineItems.reduce((sum, line) => sum + (line.amountCents || 0), 0);

  return ok({
    invoice: {
      id: `INV-${booking.ref.replace(/[^\w]/g, "").slice(-12)}`,
      bookingId: booking.id,
      bookingRef: booking.ref,
      customerName: booking.customerName,
      serviceName: booking.serviceNameSnapshot,
      issuedAtIso: booking.updatedAtIso || booking.createdAtIso,
      lineItems,
      totalCents,
      currency: "ZAR",
      status: booking.status === "COMPLETED" ? "paid" : "pending",
    },
  });
}
