import { z } from "zod";
import { badRequestFromZod, conflict, forbidden, notFound, ok } from "@/lib/api/responses";
import { canAccessJobCard, requireRole } from "@/src/lib/auth/localSession";
import { getJobCard, updateJobCardStatus } from "@/src/lib/store";
import { assertJobCardTransition } from "@/src/lib/workshop/statuses";
import { logAudit } from "@/lib/admin/audit";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import type { NotificationEventType } from "@/lib/notifications/types";

const schema = z.object({
  status: z.enum([
    "SCHEDULED",
    "EN_ROUTE",
    "ARRIVED",
    "IN_PROGRESS",
    "AWAITING_APPROVAL",
    "CANCELLED"
  ])
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_STATUS_PAYLOAD",
      "The requested job status is invalid.",
      parsed.error
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
  const transition = assertJobCardTransition(card.status, parsed.data.status);
  if (!transition.ok) {
    return conflict("INVALID_TRANSITION", transition.message);
  }

  const updated = await updateJobCardStatus(context.params.id, parsed.data.status);
  if (!updated) {
    return notFound("JOB_CARD_NOT_FOUND", "We could not find that job card.");
  }
  await logAudit({
    actor: auth.profile.phone,
    action: "job_card.status_change",
    entity: "job_card",
    entityId: updated.id,
    metadata: {
      jobCardRef: updated.ref,
      from: card.status,
      to: updated.status
    },
    shopId: updated.shopId
  });
  await logNotificationEvent({
    eventType: "job_card.status_change",
    channel: "SYSTEM_STUB",
    message: `Job card ${updated.ref} moved to ${updated.status}.`,
    target: updated.customerPhone,
    bookingId: updated.bookingId,
    bookingRef: updated.bookingRef,
    jobCardId: updated.id,
    jobCardRef: updated.ref,
    customerPhone: updated.customerPhone,
    actorProfileId: auth.profile.id,
    metadata: { from: card.status, to: updated.status }
  });
  const statusToNotification: Partial<Record<string, NotificationEventType>> = {
    EN_ROUTE: "MECHANIC_EN_ROUTE",
    ARRIVED: "MECHANIC_ARRIVED",
  };
  const notificationType = statusToNotification[updated.status];
  if (notificationType) {
    await dispatchNotification(notificationType, {
      bookingId: updated.bookingId,
      jobCardId: updated.id,
      actorProfileId: auth.profile.id,
      extraVars: { mechanicName: auth.profile.name || "Your mechanic" },
    });
  }

  return ok({ jobCard: updated });
}
