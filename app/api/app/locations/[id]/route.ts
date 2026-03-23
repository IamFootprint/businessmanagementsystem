import { z } from "zod";
import { badRequestFromZod, forbidden, notFound, ok } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/service";
import { resolveActorFromSession } from "@/lib/audit/resolveActor";
import { AppLocationsRepo } from "@/lib/planned-events/store";
import { requireRole } from "@/src/lib/auth/localSession";

const updateSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  addressLine1: z.string().trim().min(3).max(200).optional(),
  suburb: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
});

export async function PUT(request: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const current = await AppLocationsRepo.getById(context.params.id);
  if (!current) {
    return notFound("LOCATION_NOT_FOUND", "Location not found.");
  }
  if (current.profileId !== auth.profile.id) {
    return forbidden("FORBIDDEN", "You can only update your own locations.");
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_LOCATION_PAYLOAD",
      "Invalid location payload.",
      parsed.error
    );
  }

  const updated = await AppLocationsRepo.update(current.id, parsed.data);
  if (!updated) {
    return notFound("LOCATION_NOT_FOUND", "Location not found.");
  }

  await logAuditEvent({
    eventName: "location.updated",
    eventCategory: "profile",
    action: "update",
    actor: resolveActorFromSession(auth.profile),
    target: {
      type: "location",
      id: updated.id,
      display: updated.label || updated.addressLine1
    },
    beforeJson: current,
    afterJson: updated,
    shopId: auth.profile.shopId || null
  }, request);

  return ok({ location: updated });
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const current = await AppLocationsRepo.getById(context.params.id);
  if (!current) {
    return notFound("LOCATION_NOT_FOUND", "Location not found.");
  }
  if (current.profileId !== auth.profile.id) {
    return forbidden("FORBIDDEN", "You can only delete your own locations.");
  }

  const removed = await AppLocationsRepo.remove(current.id);
  if (!removed) {
    return notFound("LOCATION_NOT_FOUND", "Location not found.");
  }

  await logAuditEvent({
    eventName: "location.deleted",
    eventCategory: "profile",
    action: "delete",
    actor: resolveActorFromSession(auth.profile),
    target: {
      type: "location",
      id: removed.id,
      display: removed.label || removed.addressLine1
    },
    beforeJson: removed,
    shopId: auth.profile.shopId || null
  }, request);

  return ok({ ok: true });
}
