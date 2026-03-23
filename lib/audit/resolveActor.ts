import type { AuditActor } from "./types";

/**
 * Build an AuditActor from a session profile (AuthProfile from requireRole).
 * Accepts any object with the common fields so it works with both
 * AuthProfile and ProfileRecord without coupling to either.
 */
export function resolveActorFromSession(profile: {
  id: string;
  phone: string;
  name?: string;
  role: string;
  shopId?: string;
}): AuditActor {
  return {
    type: "user" as const,
    id: profile.id,
    display: profile.name || profile.phone,
    role: profile.role,
  };
}

/**
 * Build an AuditActor from the lightweight AdminCheckResult
 * (which only exposes profileId, phone, and role — no name).
 */
export function resolveActorFromAdmin(auth: {
  profileId?: string;
  phone?: string;
  role?: string;
}): AuditActor {
  return {
    type: "user" as const,
    id: auth.profileId || null,
    display: auth.phone || null,
    role: auth.role || null,
  };
}
