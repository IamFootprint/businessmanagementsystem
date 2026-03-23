import { z } from "zod";
import { requireRole } from "@/src/lib/auth/localSession";
import { ProfilesRepo } from "@/src/lib/store";
import { logAudit } from "@/lib/admin/audit";
import { ok, badRequest, notFound } from "@/lib/api/responses";

const profileCompleteSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().optional().or(z.literal("")),
  suburb: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  preferredMechanicId: z.string().optional(),
  whatsappOptIn: z.boolean(),
  marketingOptIn: z.boolean().optional(),
  termsAccepted: z.literal(true)
});

export async function POST(request: Request) {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const payload = await request.json().catch(() => ({}));
  const parsed = profileCompleteSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_INPUT", "Please complete all required profile fields.");
  }

  const nowIso = new Date().toISOString();
  const updated = await ProfilesRepo.update(auth.profile.id, {
    name: `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
    email: parsed.data.email ? parsed.data.email.trim() : undefined,
    suburb: parsed.data.suburb?.trim() || undefined,
    city: parsed.data.city?.trim() || undefined,
    preferredMechanicId: parsed.data.preferredMechanicId,
    onboardingStatus: "NONE",
    termsAcceptedAtIso: nowIso,
    consent: {
      whatsappOptIn: parsed.data.whatsappOptIn,
      marketingOptIn: parsed.data.marketingOptIn ?? false,
      consentedAtIso: nowIso
    }
  });

  if (!updated) {
    return notFound("NOT_FOUND", "Profile not found.");
  }

  await logAudit({
    actor: auth.profile.phone,
    action: "client.profile.completed",
    entity: "profile",
    entityId: updated.id,
    shopId: updated.shopId,
    metadata: {
      whatsappOptIn: parsed.data.whatsappOptIn,
      marketingOptIn: parsed.data.marketingOptIn ?? false
    }
  });

  return ok({
    ok: true,
    profile: {
      id: updated.id,
      name: updated.name,
      role: updated.role,
      onboardingStatus: updated.onboardingStatus
    }
  });
}
