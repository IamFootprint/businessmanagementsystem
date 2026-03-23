import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizePhone, shouldRequireE164, validateE164 } from "@/lib/auth/phone";
import { forbidden, unauthorized } from "@/lib/api/responses";
import {
  createSession,
  BookingsRepo,
  JobCardsRepo,
  getProfileForSession as getProfileForSessionFromStore,
  ProfilesRepo,
  ensureJourneyProfiles,
  getDefaultShopId
} from "@/src/lib/store";
import { resolveWorkshopRole, toLegacyRole, toWorkshopRoleSet, type AnyRole, type LegacyRole, type WorkshopRole } from "@/src/lib/auth/roles";

export const LOCAL_SESSION_COOKIE = "cd_session";
const SESSION_TTL_MINUTES = 60 * 24 * 7;

export type AuthProfile = {
  id: string;
  phone: string;
  role: WorkshopRole;
  legacyRole: LegacyRole;
  name?: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL";
  onboardingStatus?: import("@/src/lib/store").OnboardingStatus;
  termsAcceptedAtIso?: string;
  consent?: import("@/src/lib/store").ProfileConsent;
  shopId: string;
};

type RequireSessionResult =
  | { ok: true; profile: AuthProfile }
  | { ok: false; response: NextResponse };

type RequireRoleResult =
  | { ok: true; profile: AuthProfile }
  | { ok: false; response: NextResponse };

type AccessBookingInput = {
  id: string;
  customerProfileId?: string;
  shopId: string;
};

type AccessJobCardInput = {
  id: string;
  bookingId: string;
  assignedMechanicId?: string | null;
  shopId: string;
};

function unauthorizedResponse() {
  return unauthorized("UNAUTHORIZED", "You need to sign in to continue.");
}

function forbiddenResponse() {
  return forbidden("FORBIDDEN", "You do not have permission to do that.");
}

export function normalizeAndValidatePhone(input: string) {
  const normalized = normalizePhone(input);
  if (shouldRequireE164() && !validateE164(normalized)) {
    return null;
  }
  return normalized;
}

export async function requireSession(options?: {
  allowStatuses?: Array<"ACTIVE" | "INACTIVE" | "PENDING_APPROVAL">;
}): Promise<RequireSessionResult> {
  const sessionId = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  if (!sessionId) {
    return { ok: false, response: unauthorizedResponse() };
  }
  const rawProfile = await getProfileForSessionFromStore(sessionId);
  const allowedStatuses = options?.allowStatuses || ["ACTIVE"];
  if (!rawProfile || !allowedStatuses.includes(rawProfile.status)) {
    return { ok: false, response: unauthorizedResponse() };
  }

  const role = resolveWorkshopRole({
    role: rawProfile.role,
    phone: rawProfile.phone,
    name: rawProfile.name,
    shopId: rawProfile.shopId
  });

  const shopId = rawProfile.shopId || await getDefaultShopId();
  return {
    ok: true,
    profile: {
      ...rawProfile,
      role,
      legacyRole: toLegacyRole(role),
      onboardingStatus: rawProfile.onboardingStatus,
      termsAcceptedAtIso: rawProfile.termsAcceptedAtIso,
      consent: rawProfile.consent,
      shopId
    }
  };
}

export async function requireRole(
  roles: Array<AnyRole>,
  options?: { allowIncompleteMechanic?: boolean }
): Promise<RequireRoleResult> {
  const session = await requireSession();
  if (!session.ok) return session;

  const allowedRoles = toWorkshopRoleSet(roles);
  if (!allowedRoles.has(session.profile.role)) {
    return { ok: false, response: forbiddenResponse() };
  }
  if (
    session.profile.role === "MECHANIC" &&
    session.profile.onboardingStatus === "MECHANIC_PROFILE_INCOMPLETE" &&
    !options?.allowIncompleteMechanic
  ) {
    return {
      ok: false,
      response: forbidden(
        "PROFILE_INCOMPLETE",
        "Complete your mechanic profile first.",
        "Finish your skills and availability before using this page."
      )
    };
  }
  return session;
}

export async function canAccessBooking(profile: AuthProfile, booking: AccessBookingInput) {
  if (profile.role === "PLATFORM_OWNER") return true;
  if (profile.role === "SHOP_OWNER") return booking.shopId === profile.shopId;
  if (profile.role === "CLIENT") return booking.customerProfileId === profile.id;
  if (profile.role !== "MECHANIC") return false;

  const cards = await JobCardsRepo.list(profile.shopId);
  return cards.some((card) => card.bookingId === booking.id && card.assignedMechanicId === profile.id);
}

export async function canAccessJobCard(profile: AuthProfile, jobCard: AccessJobCardInput) {
  if (profile.role === "PLATFORM_OWNER") return true;
  if (profile.role === "SHOP_OWNER") return jobCard.shopId === profile.shopId;
  if (profile.role === "MECHANIC") return jobCard.assignedMechanicId === profile.id;
  if (profile.role !== "CLIENT") return false;

  const booking = await BookingsRepo.get(jobCard.bookingId);
  return Boolean(booking && booking.customerProfileId === profile.id);
}

export async function createSessionForPhone(phone: string) {
  await ensureJourneyProfiles();
  const existing = await ProfilesRepo.getByPhone(phone);
  if (!existing) {
    return { session: null, profile: null, needsRegistration: true };
  }
  if (existing.status !== "ACTIVE") {
    return { session: null, profile: existing, needsRegistration: false };
  }
  const session = await createSession(existing.id, SESSION_TTL_MINUTES);
  return { session, profile: existing, needsRegistration: false };
}

export const getProfileForSession = getProfileForSessionFromStore;
