import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCAL_SESSION_COOKIE } from "@/src/lib/auth/localSession";
import { getProfileForSession, ShopRepo } from "@/src/lib/store";
import { getRoleHomePath } from "@/src/lib/auth/roleRouting";
import { resolveWorkshopRole } from "@/src/lib/auth/roles";
import { WorkspaceShell } from "@/app/components/WorkspaceShell";
import { MECH_NAV_GROUPS } from "@/src/lib/navigation";
import SessionInactivityGuard from "@/app/components/SessionInactivityGuard";

export default async function MechanicLayout({ children }: { children: ReactNode }) {
  const sessionId = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  if (!sessionId) {
    redirect("/login?returnTo=/mech/today");
  }

  const profile = await getProfileForSession(sessionId);
  if (!profile || profile.status !== "ACTIVE") {
    redirect("/login?returnTo=/mech/today");
  }

  const role = resolveWorkshopRole({
    role: profile.role,
    phone: profile.phone,
    name: profile.name,
    shopId: profile.shopId
  });
  if (role !== "MECHANIC") {
    redirect(getRoleHomePath(role));
  }

  const shop = profile.shopId ? await ShopRepo.getById(profile.shopId) : null;

  return (
    <WorkspaceShell navGroups={MECH_NAV_GROUPS} title="Mechanic Workspace" user={{ name: profile.name, role }} shopName={shop?.name || "CycleDesk"} shopRole={role}>
      <SessionInactivityGuard />
      {children}
    </WorkspaceShell>
  );
}
