import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LOCAL_SESSION_COOKIE } from "@/src/lib/auth/localSession";
import { getProfileForSession, ShopRepo } from "@/src/lib/store";
import { resolveWorkshopRole } from "@/src/lib/auth/roles";

export async function GET() {
  const sessionId = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const profile = await getProfileForSession(sessionId);
  if (!profile || profile.status === "INACTIVE") {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let shopStatus: string | undefined;
  if (profile.shopId) {
    const shop = await ShopRepo.getById(profile.shopId);
    shopStatus = shop?.shopStatus;
  }

  return NextResponse.json({
    authenticated: true,
    profile: {
      id: profile.id,
      phone: profile.phone,
      role: resolveWorkshopRole({
        role: profile.role,
        phone: profile.phone,
        name: profile.name,
        shopId: profile.shopId
      }),
      name: profile.name,
      status: profile.status,
      onboardingStatus: profile.onboardingStatus || null,
      shopId: profile.shopId,
      shopStatus: shopStatus || null
    }
  });
}
