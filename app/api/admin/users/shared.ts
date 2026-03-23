import { z } from "zod";
import { forbidden, notFound } from "@/lib/api/responses";
import { resolveWorkshopRole, type WorkshopRole } from "@/src/lib/auth/roles";
import { ProfilesRepo } from "@/src/lib/store";
import type { AdminCheckResult } from "@/lib/admin/guard";
import type { ProfileRecord } from "@/src/lib/store";

export const userSchema = z.object({
  id: z.string().optional(),
  phone: z.string().min(6).max(20).regex(/^\+?\d[\d\s-]*$/, "Invalid phone format"),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  role: z.enum(["PLATFORM_OWNER", "SHOP_OWNER", "MECHANIC", "CLIENT"])
});

export function buildName(input: z.infer<typeof userSchema>) {
  return `${input.firstName} ${input.lastName}`.trim();
}

export function resolveProfileRole(profile: ProfileRecord) {
  return resolveWorkshopRole({
    role: profile.role,
    phone: profile.phone,
    name: profile.name,
    shopId: profile.shopId
  });
}

export function mapProfileForResponse(profile: ProfileRecord) {
  return {
    id: profile.id,
    phone: profile.phone,
    name: profile.name || null,
    role: resolveProfileRole(profile),
    status: profile.status,
    shopId: profile.shopId || null,
    createdAt: profile.createdAtIso,
    updatedAt: profile.lastLoginAtIso || profile.createdAtIso
  };
}

function allowedRolesFor(role?: WorkshopRole) {
  if (role === "PLATFORM_OWNER") {
    return new Set<WorkshopRole>(["PLATFORM_OWNER", "SHOP_OWNER", "MECHANIC", "CLIENT"]);
  }
  if (role === "SHOP_OWNER") {
    return new Set<WorkshopRole>(["MECHANIC", "CLIENT"]);
  }
  return new Set<WorkshopRole>();
}

export function canAssignRole(auth: AdminCheckResult, requestedRole: WorkshopRole) {
  return allowedRolesFor(auth.role).has(requestedRole);
}

export function persistedShopIdForRole(requestedRole: WorkshopRole, shopId?: string) {
  // Prisma can only persist ADMIN/MECHANIC/CUSTOMER, so PLATFORM_OWNER is carried by
  // ADMIN + null shopId. Local mode stores PLATFORM_OWNER explicitly and also accepts null.
  if (requestedRole === "PLATFORM_OWNER") return undefined;
  return shopId || undefined;
}

export async function getScopedTarget(auth: AdminCheckResult, id: string) {
  const target = await ProfilesRepo.getById(id);
  if (!target) {
    return { target: null, response: notFound("USER_NOT_FOUND", "We could not find that user.") };
  }

  const targetRole = resolveProfileRole(target);
  if (auth.role === "PLATFORM_OWNER") {
    return { target, targetRole, response: null };
  }

  if (auth.role !== "SHOP_OWNER") {
    return { target: null, response: forbidden("FORBIDDEN", "Not allowed.") };
  }

  if (targetRole === "PLATFORM_OWNER") {
    return { target: null, response: forbidden("FORBIDDEN", "Not allowed.") };
  }

  if (!auth.shopId || target.shopId !== auth.shopId) {
    return { target: null, response: forbidden("FORBIDDEN", "Not allowed.") };
  }

  return { target, targetRole, response: null };
}
