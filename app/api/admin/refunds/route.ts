import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { badRequestFromZod, notFound, ok } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/service";
import { resolveActorFromAdmin } from "@/lib/audit/resolveActor";
import { RefundsRepo } from "@/lib/planned-events/store";

const schema = z.object({
  refundId: z.string().optional(),
  stage: z.enum(["REQUESTED", "APPROVED", "PROCESSED"]),
  bookingId: z.string().optional(),
  invoiceId: z.string().optional(),
  paymentReference: z.string().optional(),
  amountCents: z.number().int().nonnegative().optional(),
  reasonText: z.string().trim().min(5).max(1000)
});

const EVENT_NAME_BY_STAGE = {
  REQUESTED: "refund.requested",
  APPROVED: "refund.approved",
  PROCESSED: "refund.processed"
} as const;

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_REFUND_PAYLOAD",
      "Invalid refund payload.",
      parsed.error
    );
  }

  const { stage } = parsed.data;
  let refund;
  if (stage === "REQUESTED") {
    refund = await RefundsRepo.create({
      shopId: auth.shopId!,
      bookingId: parsed.data.bookingId,
      invoiceId: parsed.data.invoiceId,
      paymentReference: parsed.data.paymentReference,
      amountCents: parsed.data.amountCents,
      reasonText: parsed.data.reasonText,
      requestedByProfileId: auth.profileId!
    });
  } else {
    if (!parsed.data.refundId) {
      return notFound("REFUND_NOT_FOUND", "Provide refundId for approval/processing.");
    }
    const existing = await RefundsRepo.getById(parsed.data.refundId);
    if (!existing || existing.shopId !== auth.shopId) {
      return notFound("REFUND_NOT_FOUND", "Refund not found.");
    }
    refund = await RefundsRepo.updateStatus(existing.id, stage, auth.profileId!);
    if (!refund) {
      return notFound("REFUND_NOT_FOUND", "Refund not found.");
    }
  }

  await logAuditEvent({
    eventName: EVENT_NAME_BY_STAGE[stage],
    eventCategory: "payment",
    action: "refund",
    subaction: stage.toLowerCase(),
    severity: stage === "REQUESTED" ? "warning" : "info",
    actor: resolveActorFromAdmin(auth),
    target: {
      type: "refund",
      id: refund.id,
      display: refund.id
    },
    reasonCode: stage,
    reasonText: parsed.data.reasonText,
    afterJson: {
      refundId: refund.id,
      status: refund.status,
      bookingId: refund.bookingId || null,
      invoiceId: refund.invoiceId || null,
      amountCents: refund.amountCents || null
    },
    contextJson: {
      paymentReference: refund.paymentReference || null,
      currency: refund.currency
    },
    isSensitive: true,
    retentionClass: "security",
    shopId: auth.shopId || null
  }, request);

  return ok({ refund });
}
