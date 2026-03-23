import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { logAudit } from "@/lib/admin/audit";
import { badRequestFromZod, conflict, created, ok, serverError, badRequest, forbidden, notFound } from "@/lib/api/responses";
import { ProfilesRepo, getDefaultShopId } from "@/src/lib/store";
import { normalizePhone } from "@/lib/auth/phone";
import { buildName, canAssignRole, getScopedTarget, mapProfileForResponse, persistedShopIdForRole, resolveProfileRole, userSchema } from "./shared";

async function resolveShopId(candidateShopId?: string | null) {
  if (candidateShopId) return candidateShopId;
  return getDefaultShopId();
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const users = auth.role === "PLATFORM_OWNER"
    ? await ProfilesRepo.list()
    : await ProfilesRepo.list(auth.shopId!);

  const visibleUsers = users.filter((profile) => {
    const resolvedRole = resolveProfileRole(profile);
    if (auth.role === "PLATFORM_OWNER") return true;
    return profile.shopId === auth.shopId && resolvedRole !== "PLATFORM_OWNER";
  });

  return ok({ users: visibleUsers.map(mapProfileForResponse) });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = userSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_USER_PAYLOAD",
      "Some user details are invalid.",
      parsed.error,
      "Review the highlighted fields and try again."
    );
  }

  const data = parsed.data;
  if (!canAssignRole(auth, data.role)) {
    return forbidden("FORBIDDEN", "Not allowed.");
  }
  const shopId = await resolveShopId(auth.shopId);
  try {
    const existing = await ProfilesRepo.getByPhone(normalizePhone(data.phone));
    if (existing) {
      return conflict(
        "USER_ALREADY_EXISTS",
        "A user with this phone number already exists.",
        "Use a different phone number or update the existing user.",
        { phone: "This phone number is already in use." }
      );
    }

    const createdUser = await ProfilesRepo.upsertByPhone({
      phone: normalizePhone(data.phone),
      name: buildName(data),
      role: data.role,
      status: "ACTIVE",
      shopId: persistedShopIdForRole(data.role, shopId)
    });

    try {
      await logAudit({
        actor: auth.phone,
        action: "user.create",
        entity: "profile",
        entityId: createdUser.id,
        metadata: {
          actionLabel: "Created user",
          actorPhone: auth.phone,
          targetDisplay: `${createdUser.name || createdUser.phone} (${createdUser.phone})`,
          diffSummary: [`Role: ${resolveProfileRole(createdUser)}`, `Status: ${createdUser.status}`]
        },
        shopId
      });
    } catch {
      // Keep user creation successful even if audit logging is unavailable.
    }

    return created({ user: mapProfileForResponse(createdUser) });
  } catch (error) {
    return serverError("USER_CREATE_FAILED", "We could not create that user.", "Try again.", error);
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = userSchema.extend({ id: z.string().min(1) }).safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_USER_PAYLOAD",
      "Some user details are invalid.",
      parsed.error,
      "Review the highlighted fields and try again."
    );
  }

  const data = parsed.data;
  if (!canAssignRole(auth, data.role)) {
    return forbidden("FORBIDDEN", "Not allowed.");
  }
  const shopId = await resolveShopId(auth.shopId);
  try {
    if (data.id === auth.profileId) {
      return forbidden("CANNOT_MODIFY_SELF", "You cannot modify your own account from this screen.");
    }

    const scoped = await getScopedTarget(auth, data.id);
    if (scoped.response) return scoped.response;
    const before = scoped.target;
    if (!before) return notFound("USER_NOT_FOUND", "We could not find that user.");

    const existingWithPhone = await ProfilesRepo.getByPhone(normalizePhone(data.phone));
    if (existingWithPhone && existingWithPhone.id !== data.id) {
      return conflict(
        "USER_ALREADY_EXISTS",
        "A user with this phone number already exists.",
        "Use a different phone number or update the existing user.",
        { phone: "This phone number is already in use." }
      );
    }

    const updated = await ProfilesRepo.update(data.id, {
      phone: normalizePhone(data.phone),
      name: buildName(data),
      role: data.role,
      shopId: persistedShopIdForRole(data.role, before.shopId || shopId || undefined)
    });
    if (!updated) {
      return notFound("USER_NOT_FOUND", "We could not find that user.");
    }

    try {
      const beforeRole = resolveProfileRole(before);
      const afterRole = resolveProfileRole(updated);
      await logAudit({
        actor: auth.phone,
        action: "user.update",
        entity: "profile",
        entityId: updated.id,
        metadata: {
          actionLabel: "Updated user",
          actorPhone: auth.phone,
          targetDisplay: `${updated.name || updated.phone} (${updated.phone})`,
          diffSummary: [
            before?.phone !== updated.phone ? `Phone: ${before?.phone || "—"} -> ${updated.phone}` : null,
            before?.name !== updated.name ? `Name: ${before?.name || "—"} -> ${updated.name || "—"}` : null,
            beforeRole !== afterRole ? `Role: ${beforeRole} -> ${afterRole}` : null,
            before?.shopId !== updated.shopId ? `Shop: ${before?.shopId || "—"} -> ${updated.shopId || "—"}` : null
          ].filter(Boolean)
        },
        shopId
      });
    } catch {
      // Keep user updates successful even if audit logging is unavailable.
    }

    return ok({ user: mapProfileForResponse(updated) });
  } catch (error) {
    return serverError("USER_UPDATE_FAILED", "We could not update that user.", "Try again.", error);
  }
}
