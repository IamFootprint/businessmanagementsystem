import { z } from "zod";
import { requireRole } from "@/src/lib/auth/localSession";
import { BikesRepo } from "@/src/lib/store";
import { ok, badRequest, notFound, forbidden } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/service";
import { resolveActorFromSession } from "@/lib/audit/resolveActor";

const updateSchema = z.object({
  bikeType: z.enum(["MTB", "ROAD", "GRAVEL", "E_BIKE", "OTHER"]).optional(),
  brand: z.string().min(1).optional(),
  model: z.string().optional(),
  drivetrainType: z.string().optional(),
  brakeType: z.string().optional(),
  eBike: z.boolean().optional(),
  notes: z.string().optional()
});

export async function PUT(request: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const current = await BikesRepo.getById(context.params.id);
  if (!current) {
    return notFound("NOT_FOUND", "Bike not found.");
  }
  if (auth.profile.role === "CLIENT" && current.customerProfileId !== auth.profile.id) {
    return forbidden("FORBIDDEN", "Not allowed.");
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_INPUT", "Invalid bike update.");
  }

  const bike = await BikesRepo.update(current.id, parsed.data);
  if (bike) {
    await logAuditEvent({
      eventName: "profile.bike.updated",
      eventCategory: "profile",
      action: "update",
      actor: {
        type: "user",
        id: auth.profile.id,
        display: auth.profile.phone,
        role: auth.profile.role
      },
      target: {
        type: "bike",
        id: bike.id,
        display: `${bike.brand} ${bike.model || ""}`.trim()
      },
      beforeJson: current,
      afterJson: bike,
      shopId: auth.profile.shopId || null
    }, request);
  }
  return ok({ bike });
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const current = await BikesRepo.getById(context.params.id);
  if (!current) {
    return notFound("NOT_FOUND", "Bike not found.");
  }
  if (auth.profile.role === "CLIENT" && current.customerProfileId !== auth.profile.id) {
    return forbidden("FORBIDDEN", "Not allowed.");
  }

  await BikesRepo.remove(current.id);

  await logAuditEvent({
    eventName: "profile.bike.deleted",
    eventCategory: "profile",
    action: "delete",
    actor: resolveActorFromSession(auth.profile),
    target: {
      type: "bike",
      id: current.id,
      display: `${current.brand} ${current.model || ""}`.trim()
    },
    beforeJson: current,
    shopId: auth.profile.shopId || null
  }, request);
  return ok({ ok: true });
}
