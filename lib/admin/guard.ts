import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getProfileForSession, LOCAL_SESSION_COOKIE } from "@/src/lib/auth/localSession";
import { getDefaultShopId, ShopRepo } from "@/src/lib/store";
import { resolveWorkshopRole, isOwnerRole, type WorkshopRole } from "@/src/lib/auth/roles";
import { forbidden, unauthorized } from "@/lib/api/responses";

export type AdminCheckResult = {
  ok: boolean;
  profileId?: string;
  phone?: string;
  shopId?: string;
  role?: WorkshopRole;
  response?: NextResponse;
};

export async function requireAdmin(): Promise<AdminCheckResult> {
  const localSessionId = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  if (!localSessionId) {
    return {
      ok: false,
      response: unauthorized("UNAUTHORIZED", "You need to sign in to continue.")
    };
  }

  const profile = await getProfileForSession(localSessionId);
  if (!profile || profile.status !== "ACTIVE") {
    return {
      ok: false,
      response: unauthorized("UNAUTHORIZED", "You need to sign in to continue.")
    };
  }
  const role = resolveWorkshopRole({
    role: profile.role,
    phone: profile.phone,
    name: profile.name,
    shopId: profile.shopId
  });
  if (!isOwnerRole(role)) {
    return {
      ok: false,
      response: forbidden("FORBIDDEN", "You do not have access to this admin area.")
    };
  }

  const allowlist = process.env.ADMIN_PHONE_ALLOWLIST;
  if (allowlist) {
    const phones = allowlist.split(",").map((e) => e.trim()).filter(Boolean);
    if (phones.length > 0 && !phones.includes(profile.phone)) {
      return {
        ok: false,
        response: forbidden("FORBIDDEN", "This phone number is not allowed to access admin.")
      };
    }
  }

  const shopId = profile.shopId || await getDefaultShopId();
  if (role === "SHOP_OWNER") {
    const shop = profile.shopId ? await ShopRepo.getById(profile.shopId) : null;
    if (!shop || shop.shopStatus !== "ACTIVE") {
      return {
        ok: false,
        response: forbidden(
          "SHOP_PENDING_APPROVAL",
          "Your shop is not active yet.",
          "Wait for platform approval before using admin tools."
        )
      };
    }
  }
  return { ok: true, profileId: profile.id, phone: profile.phone, shopId, role };
}

export async function requirePlatformOwner(): Promise<AdminCheckResult> {
  const localSessionId = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  if (!localSessionId) {
    return {
      ok: false,
      response: unauthorized("UNAUTHORIZED", "You need to sign in to continue.")
    };
  }

  const profile = await getProfileForSession(localSessionId);
  if (!profile || profile.status !== "ACTIVE") {
    return {
      ok: false,
      response: unauthorized("UNAUTHORIZED", "You need to sign in to continue.")
    };
  }
  const role = resolveWorkshopRole({
    role: profile.role,
    phone: profile.phone,
    name: profile.name,
    shopId: profile.shopId
  });
  if (role !== "PLATFORM_OWNER") {
    return {
      ok: false,
      response: forbidden("FORBIDDEN", "Platform owner access is required.")
    };
  }
  return { ok: true, profileId: profile.id, phone: profile.phone, shopId: profile.shopId || undefined, role };
}
