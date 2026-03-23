import { z } from "zod";
import { ok, badRequestFromZod } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/service";

const payloadSchema = z.object({
  provider: z.string().min(2),
  eventType: z.string().min(2),
  providerReference: z.string().optional(),
  bookingId: z.string().optional(),
  invoiceId: z.string().optional(),
  status: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

function isReconciledStatus(status?: string) {
  if (!status) return false;
  const value = status.toLowerCase();
  return value === "paid" || value === "reconciled" || value === "success";
}

function isFailedStatus(status?: string) {
  if (!status) return false;
  const value = status.toLowerCase();
  return value === "failed" || value === "declined" || value === "cancelled" || value === "error";
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    await logAuditEvent({
      eventName: "payment.webhook.received",
      eventCategory: "payment",
      action: "webhook_receive",
      outcome: "failure",
      severity: "warning",
      actor: { type: "webhook", display: "webhook:unknown" },
      target: { type: "payment_webhook", display: "invalid_payload" },
      reasonCode: "INVALID_WEBHOOK_PAYLOAD",
      contextJson: { payload },
      isSensitive: true,
      retentionClass: "security"
    }, request);
    return badRequestFromZod(
      "INVALID_WEBHOOK_PAYLOAD",
      "Webhook payload is invalid.",
      parsed.error
    );
  }

  const data = parsed.data;
  await logAuditEvent({
    eventName: "payment.webhook.received",
    eventCategory: "payment",
    action: "webhook_receive",
    actor: {
      type: "webhook",
      display: `webhook:${data.provider}`
    },
    target: {
      type: "payment",
      id: data.providerReference || null,
      display: data.providerReference || `${data.provider}:${data.eventType}`
    },
    contextJson: {
      provider: data.provider,
      eventType: data.eventType,
      status: data.status || null,
      bookingId: data.bookingId || null,
      invoiceId: data.invoiceId || null,
      metadata: data.metadata || null
    },
    isSensitive: true,
    retentionClass: "security"
  }, request);

  if (isReconciledStatus(data.status)) {
    await logAuditEvent({
      eventName: "payment.succeeded",
      eventCategory: "payment",
      action: "succeed",
      actor: {
        type: "webhook",
        display: `webhook:${data.provider}`
      },
      target: {
        type: "payment",
        id: data.providerReference || null,
        display: data.providerReference || `${data.provider}:${data.eventType}`
      },
      contextJson: {
        provider: data.provider,
        eventType: data.eventType,
        status: data.status || null,
        bookingId: data.bookingId || null,
        invoiceId: data.invoiceId || null
      },
      isSensitive: true,
      retentionClass: "security"
    }, request);

    await logAuditEvent({
      eventName: "payment.reconciled",
      eventCategory: "payment",
      action: "reconcile",
      actor: {
        type: "webhook",
        display: `webhook:${data.provider}`
      },
      target: {
        type: "payment",
        id: data.providerReference || null,
        display: data.providerReference || `${data.provider}:${data.eventType}`
      },
      contextJson: {
        provider: data.provider,
        eventType: data.eventType,
        status: data.status || null,
        bookingId: data.bookingId || null,
        invoiceId: data.invoiceId || null
      },
      isSensitive: true,
      retentionClass: "security"
    }, request);
  }

  if (isFailedStatus(data.status)) {
    await logAuditEvent({
      eventName: "payment.failed",
      eventCategory: "payment",
      action: "fail",
      outcome: "failure",
      severity: "warning",
      actor: {
        type: "webhook",
        display: `webhook:${data.provider}`
      },
      target: {
        type: "payment",
        id: data.providerReference || null,
        display: data.providerReference || `${data.provider}:${data.eventType}`
      },
      reasonCode: "PAYMENT_FAILED_STATUS",
      reasonText: data.status || "FAILED",
      contextJson: {
        provider: data.provider,
        eventType: data.eventType,
        status: data.status || null,
        bookingId: data.bookingId || null,
        invoiceId: data.invoiceId || null
      },
      isSensitive: true,
      retentionClass: "security"
    }, request);
  }

  return ok({ received: true });
}
