import { z } from "zod";
import { badRequestFromZod, conflict, forbidden, notFound, ok } from "@/lib/api/responses";
import { canAccessJobCard, requireRole } from "@/src/lib/auth/localSession";
import { getJobCard, JobCardsRepo } from "@/src/lib/store";
import { assertJobCardTransition } from "@/src/lib/workshop/statuses";
import { logAudit } from "@/lib/admin/audit";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";

const schema = z.object({
  name: z.string().min(1),
  amountCents: z.number().int().min(1),
  type: z.enum(["CONSUMABLE", "ADDITIONAL"]).default("ADDITIONAL")
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_EXTRA_PAYLOAD",
      "Some extra charge details are invalid.",
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
  if (!["IN_PROGRESS", "AWAITING_APPROVAL"].includes(card.status)) {
    return conflict(
      "INVALID_STATE",
      "Extras can only be proposed while the job is in progress."
    );
  }
  if (card.status === "IN_PROGRESS") {
    const transition = assertJobCardTransition(card.status, "AWAITING_APPROVAL");
    if (!transition.ok) {
      return conflict("INVALID_TRANSITION", transition.message);
    }
  }

  let updated = await JobCardsRepo.addAdditionalCharge(card.id, {
    id: `extra_${Date.now()}`,
    name: parsed.data.name,
    amountCents: parsed.data.amountCents,
    type: parsed.data.type,
    approvalStatus: "PENDING",
    proposedAtIso: new Date().toISOString()
  });
  if (updated && updated.status === "IN_PROGRESS") {
    updated = await JobCardsRepo.updateStatus(updated.id, "AWAITING_APPROVAL");
  }
  if (updated) {
    await logAudit({
      actor: auth.profile.phone,
      action: "job_card.extra.proposed",
      entity: "job_card",
      entityId: updated.id,
      metadata: {
        jobCardRef: updated.ref,
        chargeName: parsed.data.name,
        amountCents: parsed.data.amountCents
      },
      shopId: updated.shopId
    });
    await logNotificationEvent({
      eventType: "job_card.extra.proposed",
      channel: "SYSTEM_STUB",
      message: `Extra proposed on job card ${updated.ref}: ${parsed.data.name}.`,
      target: updated.customerPhone,
      bookingId: updated.bookingId,
      bookingRef: updated.bookingRef,
      jobCardId: updated.id,
      jobCardRef: updated.ref,
      customerPhone: updated.customerPhone,
      actorProfileId: auth.profile.id
    });
    await dispatchNotification("ADDITIONAL_CHARGE_REQUESTED", {
      bookingId: updated.bookingId,
      jobCardId: updated.id,
      actorProfileId: auth.profile.id,
      extraVars: {
        chargeDescription: parsed.data.name,
        chargeAmount: `R${(parsed.data.amountCents / 100).toFixed(2)}`,
      },
    });
  }
  return ok({ jobCard: updated });
}
