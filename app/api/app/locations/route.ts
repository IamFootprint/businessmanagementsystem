import { z } from "zod";
import { badRequestFromZod, ok } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/service";
import { resolveActorFromSession } from "@/lib/audit/resolveActor";
import { AppLocationsRepo } from "@/lib/planned-events/store";
import { requireRole } from "@/src/lib/auth/localSession";

const createSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  addressLine1: z.string().trim().min(3).max(200),
  suburb: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
});

export async function GET() {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const locations = await AppLocationsRepo.listByProfile(auth.profile.id);
  return ok({ locations });
}

export async function POST(request: Request) {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const payload = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_LOCATION_PAYLOAD",
      "Invalid location payload.",
      parsed.error
    );
  }

  const location = await AppLocationsRepo.create({
    profileId: auth.profile.id,
    label: parsed.data.label,
    addressLine1: parsed.data.addressLine1,
    suburb: parsed.data.suburb,
    city: parsed.data.city,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude
  });

  await logAuditEvent({
    eventName: "location.created",
    eventCategory: "profile",
    action: "create",
    actor: resolveActorFromSession(auth.profile),
    target: {
      type: "location",
      id: location.id,
      display: location.label || location.addressLine1
    },
    afterJson: location,
    contextJson: {
      city: location.city || null,
      suburb: location.suburb || null
    },
    shopId: auth.profile.shopId || null
  }, request);

  return ok({ location });
}
