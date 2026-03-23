import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCAL_SESSION_COOKIE } from "@/src/lib/auth/localSession";
import { getProfileForSession, ShopRepo } from "@/src/lib/store";
import { getRoleHomePath } from "@/src/lib/auth/roleRouting";
import { resolveWorkshopRole } from "@/src/lib/auth/roles";
import { CustomerShell } from "@/app/components/CustomerShell";
import ShopStatusBar from "@/app/components/ShopStatusBar";
import SessionInactivityGuard from "@/app/components/SessionInactivityGuard";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const sessionId = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  if (!sessionId) {
    redirect("/login?returnTo=/app");
  }

  const profile = await getProfileForSession(sessionId);
  if (!profile || profile.status !== "ACTIVE") {
    redirect("/login?returnTo=/app");
  }

  const role = resolveWorkshopRole({
    role: profile.role,
    phone: profile.phone,
    name: profile.name,
    shopId: profile.shopId
  });

  if (role !== "CLIENT") {
    redirect(getRoleHomePath(role));
  }
  if (profile.onboardingStatus === "CLIENT_PROFILE_INCOMPLETE") {
    redirect("/signup/complete");
  }

  const shop = profile.shopId ? await ShopRepo.getById(profile.shopId) : null;

  return (
    <>
      <ShopStatusBar shopName={shop?.name || "CycleDesk"} role={role} />
      <CustomerShell user={{ name: profile.name }}>
        <SessionInactivityGuard />
        {children}
      </CustomerShell>
    </>
  );
}
