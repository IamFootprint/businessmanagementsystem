import { z } from "zod";
import { badRequestFromZod, forbidden, notFound, ok } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/service";
import { PaymentInitiationsRepo } from "@/lib/planned-events/store";
import { BookingsRepo } from "@/src/lib/store";
import { canAccessBooking, requireRole } from "@/src/lib/auth/localSession";
import { dispatchNotification } from "@/lib/notifications/dispatch";

const schema = z.object({
  provider: z.enum(["PAYFAST", "YOCO", "EFT"]).default("PAYFAST")
});

function estimateDepositAmountCents(booking: Awaited<ReturnType<typeof BookingsRepo.get>>) {
  if (!booking) return 0;
  const total = booking.pricingSnapshot?.totalCents || 0;
  if (total > 0) return Math.round(total * 0.5);
  return 0;
}

export async function POST(request: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["CLIENT", "SHOP_OWNER", "PLATFORM_OWNER"]);
  if (!auth.ok) return auth.response!;

  const booking = await BookingsRepo.get(context.params.id);
  if (!booking) {
    await logAuditEvent({
      eventName: "payment.failed",
      eventCategory: "payment",
      action: "initiate",
      outcome: "failure",
      severity: "warning",
      actor: {
        type: "user",
        id: auth.profile.id,
        display: auth.profile.phone,
        role: auth.profile.role
      },
      target: {
        type: "booking",
        id: context.params.id,
        display: context.params.id
      },
      reasonCode: "BOOKING_NOT_FOUND",
      reasonText: "Booking not found for payment initiation.",
      isSensitive: true,
      retentionClass: "security",
      shopId: auth.profile.shopId
    }, request);
    return notFound("BOOKING_NOT_FOUND", "Booking not found.");
  }

  const allowed = await canAccessBooking(auth.profile, booking);
  if (!allowed) {
    return forbidden("FORBIDDEN", "You do not have access to this booking.");
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    await logAuditEvent({
      eventName: "payment.failed",
      eventCategory: "payment",
      action: "initiate",
      outcome: "failure",
      severity: "warning",
      actor: {
        type: "user",
        id: auth.profile.id,
        display: auth.profile.phone,
        role: auth.profile.role
      },
      target: {
        type: "booking",
        id: booking.id,
        display: booking.ref
      },
      reasonCode: "INVALID_PAYMENT_INITIATION_PAYLOAD",
      reasonText: "Invalid payment initiation payload.",
      contextJson: { payload },
      isSensitive: true,
      retentionClass: "security",
      shopId: booking.shopId
    }, request);
    return badRequestFromZod(
      "INVALID_PAYMENT_INITIATION_PAYLOAD",
      "Invalid payment initiation payload.",
      parsed.error
    );
  }

  const amountCents = estimateDepositAmountCents(booking);
  const initiated = await PaymentInitiationsRepo.create({
    bookingId: booking.id,
    shopId: booking.shopId,
    actorProfileId: auth.profile.id,
    provider: parsed.data.provider,
    amountCents
  });

  await logAuditEvent({
    eventName: "payment.initiated",
    eventCategory: "payment",
    action: "initiate",
    actor: {
      type: "user",
      id: auth.profile.id,
      display: auth.profile.phone,
      role: auth.profile.role
    },
    target: {
      type: "booking",
      id: booking.id,
      display: booking.ref
    },
    afterJson: {
      paymentInitiationId: initiated.id,
      provider: initiated.provider,
      amountCents: initiated.amountCents,
      currency: initiated.currency
    },
    contextJson: {
      checkoutType: "deposit",
      bookingStatus: booking.status
    },
    isSensitive: true,
    retentionClass: "security",
    shopId: booking.shopId
  }, request);

  await dispatchNotification("PAYMENT_RECEIVED", {
    bookingId: booking.id,
    actorProfileId: auth.profile.id,
    extraVars: {
      amount: `R${(initiated.amountCents / 100).toFixed(2)}`,
    },
  });

  return ok({
    checkout: {
      id: initiated.id,
      provider: initiated.provider,
      amountCents: initiated.amountCents,
      currency: initiated.currency,
      checkoutUrl: `/payments/mock/${initiated.id}`
    }
  });
}
