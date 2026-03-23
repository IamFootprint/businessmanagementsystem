import { z } from "zod";
import { badRequest, badRequestFromZod, conflict, forbidden, notFound, ok } from "@/lib/api/responses";
import { canAccessJobCard, requireRole } from "@/src/lib/auth/localSession";
import { getPublicPackageById } from "@/lib/catalog/publicPackages";
import {
  BookingsRepo,
  InvoicesRepo,
  JobCardsRepo,
  ServiceItemsRepo,
  getJobCard
} from "@/src/lib/store";
import { assertBookingTransition, assertJobCardTransition } from "@/src/lib/workshop/statuses";
import { applyInventoryUsage } from "@/src/lib/workshop/inventory";
import { logAudit } from "@/lib/admin/audit";
import { logAuditEvent } from "@/lib/audit/service";
import { resolveActorFromSession } from "@/lib/audit/resolveActor";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";

const checklistSchema = z.object({
  intakeDone: z.boolean(),
  washDone: z.boolean(),
  drivetrain: z.boolean(),
  brakes: z.boolean(),
  wheels: z.boolean(),
  suspension: z.boolean(),
  torqueCheck: z.boolean(),
  testRide: z.boolean()
});

const partsSchema = z.array(
  z.object({
    inventoryItemId: z.string().optional(),
    location: z.string().min(1).optional(),
    name: z.string().min(1),
    brand: z.string().min(1).optional(),
    qty: z.number().min(1),
    unitPriceCents: z.number().int().min(0).optional()
  })
);

const schema = z.object({
  customerName: z.string().min(2),
  approved: z.boolean(),
  summary: z.string().optional(),
  checklist: checklistSchema.optional(),
  partsUsed: partsSchema.optional()
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_COMPLETION_PAYLOAD",
      "Some completion details are invalid.",
      parsed.error,
      "Review the sign-off details and try again."
    );
  }
  if (!parsed.data.approved) {
    return badRequest(
      "CUSTOMER_APPROVAL_REQUIRED",
      "Customer approval is required before completion.",
      "Tick the customer approval checkbox to continue."
    );
  }

  const card = await getJobCard(context.params.id);
  if (!card) {
    return notFound("JOB_CARD_NOT_FOUND", "We could not find that job card.");
  }
  const allowed = await canAccessJobCard(auth.profile, card);
  if (!allowed) {
    return forbidden("FORBIDDEN", "This job card is not assigned to you.");
  }
  if (card.completion?.completedAtIso) {
    return conflict("JOB_CARD_LOCKED", "This job card has already been completed.");
  }
  const pendingExtras = (card.additionalCharges || []).filter((charge) => charge.approvalStatus === "PENDING");
  if (pendingExtras.length > 0) {
    return conflict(
      "PENDING_EXTRAS",
      "Resolve pending extras before completion.",
      "Ask the customer to approve or reject the extras first."
    );
  }
  const transition = assertJobCardTransition(card.status, "COMPLETED");
  if (!transition.ok) {
    return conflict("INVALID_TRANSITION", transition.message);
  }

  const updated = await JobCardsRepo.complete(card.id, {
    completedAtIso: new Date().toISOString(),
    summary: parsed.data.summary,
    customerSignoffName: parsed.data.customerName,
    customerSignoffAccepted: parsed.data.approved
  });
  if (!updated) {
    return notFound("JOB_CARD_NOT_FOUND", "We could not find that job card.");
  }

  let finalCard = updated;
  if (parsed.data.partsUsed?.length) {
    for (const part of parsed.data.partsUsed) {
      if (!part.name.trim()) continue;
      const nextCard = await JobCardsRepo.addPart(updated.id, {
        id: `part_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        inventoryItemId: part.inventoryItemId,
        location: part.location,
        name: part.name,
        brand: part.brand,
        qty: part.qty,
        unitPriceCents: part.unitPriceCents
      });
      if (nextCard) finalCard = nextCard;
    }
  }

  const booking = await BookingsRepo.get(finalCard.bookingId);
  if (booking) {
    const fromStatus = booking.status;
    const bookingTransition = assertBookingTransition(booking.status, "COMPLETED");
    if (!bookingTransition.ok) {
      return conflict("INVALID_TRANSITION", bookingTransition.message);
    }
    const updatedBooking = await BookingsRepo.update(booking.id, { status: "COMPLETED" });
    if (updatedBooking) {
      await logAuditEvent({
        eventName: "booking.status.changed",
        eventCategory: "booking",
        action: "status_change",
        actor: resolveActorFromSession(auth.profile),
        target: {
          type: "booking",
          id: updatedBooking.id,
          display: updatedBooking.ref
        },
        beforeJson: { status: fromStatus },
        afterJson: { status: updatedBooking.status },
        contextJson: { source: "job_card.complete", jobCardId: finalCard.id },
        shopId: updatedBooking.shopId
      }, req);
    }
  }
  await applyInventoryUsage(
    (finalCard.partsUsed || []).map((part) => ({
      inventoryItemId: part.inventoryItemId,
      qty: part.qty
    }))
  );

  const existingInvoice = await InvoicesRepo.getByJobCardId(finalCard.id);
  if (existingInvoice) {
    return ok({ jobCard: finalCard, invoice: existingInvoice });
  }

  const service = booking?.serviceItemId ? await ServiceItemsRepo.get(booking.serviceItemId) : null;
  const selectedPackage = booking?.selectedPackageId
    ? await getPublicPackageById(booking.selectedPackageId)
    : null;
  const labourCents =
    service?.basePriceCents ??
    selectedPackage?.priceCents ??
    booking?.pricingSnapshot?.totalCents ??
    0;
  const partLines = (finalCard.partsUsed || []).map((part) => ({
    id: `line_part_${part.id}`,
    label: `${part.location ? `${part.location}: ` : ""}${part.brand ? `${part.brand} ` : ""}${part.name}${part.qty > 1 ? ` x${part.qty}` : ""}`,
    qty: part.qty,
    amountCents: (part.unitPriceCents || 0) * part.qty,
    type: "PART" as const
  }));
  const extraLines = (finalCard.additionalCharges || [])
    .filter((charge) => charge.approvalStatus !== "REJECTED")
    .map((charge) => ({
    id: `line_extra_${charge.id}`,
    label: charge.name,
    amountCents: charge.amountCents,
    type: charge.type === "CONSUMABLE" ? ("CONSUMABLE" as const) : ("ADDITIONAL" as const)
    }));
  const lineItems = [
    {
      id: "line_labour",
      label: finalCard.serviceName || "Service labour",
      amountCents: labourCents,
      type: "LABOUR" as const
    },
    ...partLines,
    ...extraLines
  ];
  const subtotalCents = lineItems.reduce((sum, line) => sum + line.amountCents, 0);
  const invoice = await InvoicesRepo.create({
    shopId: auth.profile.shopId,
    jobCardId: finalCard.id,
    bookingId: finalCard.bookingId,
    bookingRef: finalCard.bookingRef,
    customerName: finalCard.customerName,
    customerPhone: finalCard.customerPhone,
    issuedAtIso: new Date().toISOString(),
    issuedByProfileId: auth.profile.id,
    status: "ISSUED",
    lineItems,
    subtotalCents,
    totalCents: subtotalCents
  });
  await logAudit({
    actor: auth.profile.phone,
    action: "job_card.complete",
    entity: "job_card",
    entityId: finalCard.id,
    metadata: {
      jobCardRef: finalCard.ref,
      bookingRef: finalCard.bookingRef,
      invoiceRef: invoice.ref
    },
    shopId: auth.profile.shopId
  });
  await logAuditEvent({
    eventName: "invoice.issued",
    eventCategory: "invoice",
    action: "issue",
    actor: {
      type: "user",
      id: auth.profile.id,
      display: auth.profile.phone,
      role: auth.profile.role
    },
    target: {
      type: "invoice",
      id: invoice.id,
      display: invoice.ref
    },
    afterJson: {
      invoiceRef: invoice.ref,
      bookingRef: invoice.bookingRef,
      totalCents: invoice.totalCents
    },
    contextJson: {
      bookingId: invoice.bookingId,
      jobCardId: invoice.jobCardId
    },
    shopId: invoice.shopId
  }, req);
  await logNotificationEvent({
    eventType: "job_card.completed",
    channel: "SYSTEM_STUB",
    message: `Job card ${finalCard.ref} completed.`,
    target: finalCard.customerPhone,
    bookingId: finalCard.bookingId,
    bookingRef: finalCard.bookingRef,
    jobCardId: finalCard.id,
    jobCardRef: finalCard.ref,
    customerPhone: finalCard.customerPhone,
    actorProfileId: auth.profile.id,
    metadata: { invoiceRef: invoice.ref }
  });
  await dispatchNotification("JOB_COMPLETE", {
    bookingId: finalCard.bookingId,
    jobCardId: finalCard.id,
    invoiceId: invoice.id,
    actorProfileId: auth.profile.id,
    extraVars: { invoiceRef: invoice.ref },
  });
  await dispatchNotification("INVOICE_ISSUED", {
    bookingId: finalCard.bookingId,
    jobCardId: finalCard.id,
    invoiceId: invoice.id,
    actorProfileId: auth.profile.id,
    extraVars: {
      invoiceRef: invoice.ref,
      amount: `R${(invoice.totalCents / 100).toFixed(2)}`,
    },
  });

  return ok({ jobCard: finalCard, invoice });
}
