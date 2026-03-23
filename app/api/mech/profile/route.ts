import { z } from "zod";
import { requireRole } from "@/src/lib/auth/localSession";
import { ProfilesRepo } from "@/src/lib/store";
import { logAudit } from "@/lib/admin/audit";
import { ok, badRequest, notFound } from "@/lib/api/responses";

const schema = z.object({
  name: z.string().min(2).max(120).optional(),
  specialties: z.array(z.string().min(1)).max(20).optional(),
  availability: z
    .object({
      weeklyHours: z
        .array(
          z.object({
            day: z.string().min(2),
            start: z.string().min(3),
            end: z.string().min(3),
            active: z.boolean()
          })
        )
        .optional(),
      blackoutDates: z.array(z.string()).optional()
    })
    .optional()
});

export async function GET() {
  const auth = await requireRole(["MECHANIC"], { allowIncompleteMechanic: true });
  if (!auth.ok) return auth.response!;

  const profile = await ProfilesRepo.getById(auth.profile.id);
  if (!profile) {
    return notFound("PROFILE_NOT_FOUND", "Profile not found.");
  }
  return ok({ profile });
}

export async function POST(req: Request) {
  const auth = await requireRole(["MECHANIC"], { allowIncompleteMechanic: true });
  if (!auth.ok) return auth.response!;

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_PROFILE_PAYLOAD", "Invalid profile payload.");
  }

  const updated = await ProfilesRepo.update(auth.profile.id, parsed.data);
  if (!updated) {
    return notFound("PROFILE_NOT_FOUND", "Profile not found.");
  }
  await logAudit({
    actor: auth.profile.phone,
    action: "mechanic.profile.update",
    entity: "profile",
    entityId: auth.profile.id,
    metadata: parsed.data,
    shopId: auth.profile.shopId
  });
  let responseProfile = updated;
  if (updated.onboardingStatus === "MECHANIC_PROFILE_INCOMPLETE") {
    const completed = await ProfilesRepo.update(auth.profile.id, { onboardingStatus: "NONE" });
    if (completed) responseProfile = completed;
  }
  return ok({ profile: responseProfile });
}
