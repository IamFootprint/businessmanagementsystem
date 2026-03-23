import { z } from "zod";
import { requireRole, normalizeAndValidatePhone } from "@/src/lib/auth/localSession";
import { ProfilesRepo } from "@/src/lib/store";
import { ok, badRequest, conflict, notFound } from "@/lib/api/responses";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(6).optional(),
});

export async function GET() {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const profile = await ProfilesRepo.getById(auth.profile.id);
  if (!profile) {
    return notFound("PROFILE_NOT_FOUND", "Profile not found.");
  }

  return ok({
    profile: {
      id: profile.id,
      name: profile.name || "",
      phone: profile.phone,
      role: profile.role,
      status: profile.status,
      createdAtIso: profile.createdAtIso,
    },
  });
}

export async function PUT(request: Request) {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const payload = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_PROFILE_UPDATE", "Invalid profile update.");
  }

  const updates: { name?: string; phone?: string } = {};
  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name.trim();
  }

  if (parsed.data.phone !== undefined) {
    const normalized = normalizeAndValidatePhone(parsed.data.phone);
    if (!normalized) {
      return badRequest("INVALID_PHONE", "Enter a valid phone number.");
    }
    const existing = await ProfilesRepo.getByPhone(normalized);
    if (existing && existing.id !== auth.profile.id) {
      return conflict("PHONE_IN_USE", "That phone number is already used by another account.");
    }
    updates.phone = normalized;
  }

  const updated = await ProfilesRepo.update(auth.profile.id, updates);
  if (!updated) {
    return notFound("PROFILE_NOT_FOUND", "Profile not found.");
  }

  return ok({
    profile: {
      id: updated.id,
      name: updated.name || "",
      phone: updated.phone,
      role: updated.role,
      status: updated.status,
      createdAtIso: updated.createdAtIso,
    },
  });
}
