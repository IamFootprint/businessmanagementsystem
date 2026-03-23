import { resolveWorkshopRole, type AnyRole } from "@/src/lib/auth/roles";

export function getRoleHomePath(
  role?: AnyRole | null,
  params?: {
    phone?: string | null;
    name?: string | null;
    shopId?: string | null;
    onboardingStatus?: string | null;
    profileStatus?: string | null;
    shopStatus?: string | null;
  }
) {
  const resolved = resolveWorkshopRole({
    role: role || undefined,
    phone: params?.phone,
    name: params?.name,
    shopId: params?.shopId
  });
  if (resolved === "PLATFORM_OWNER") return "/admin/platform/shops";
  if (resolved === "SHOP_OWNER") {
    if (params?.profileStatus === "PENDING_APPROVAL") return "/partner/pending";
    if (params?.shopStatus && params.shopStatus !== "ACTIVE") return "/partner/pending";
    if (params?.onboardingStatus === "SHOP_REGISTRATION_STARTED") return "/partner/onboarding";
    if (params?.onboardingStatus === "SHOP_PENDING_APPROVAL") return "/partner/pending";
    return "/admin";
  }
  if (resolved === "MECHANIC") {
    if (params?.onboardingStatus === "MECHANIC_PROFILE_INCOMPLETE") return "/mech/profile";
    return "/mech/today";
  }
  if (params?.onboardingStatus === "CLIENT_PROFILE_INCOMPLETE") return "/signup/complete";
  return "/app";
}
