import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCAL_SESSION_COOKIE } from "@/src/lib/auth/localSession";
import { getProfileForSession, ShopRepo } from "@/src/lib/store";
import { getRoleHomePath } from "@/src/lib/auth/roleRouting";
import { isOwnerRole, resolveWorkshopRole } from "@/src/lib/auth/roles";
import { AdminUiProvider } from "./admin-ui";
import { getAdminNavGroups } from "./admin-nav";
import { WorkspaceShell } from "@/app/components/WorkspaceShell";
import SessionInactivityGuard from "@/app/components/SessionInactivityGuard";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const localSessionId = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  let canEdit = true;
  let reason: string | undefined;

  if (!localSessionId) {
    redirect("/login?returnTo=/admin");
  }

  const profile = await getProfileForSession(localSessionId);
  if (!profile || profile.status === "INACTIVE") {
    redirect("/login?returnTo=/admin");
  }
  const role = resolveWorkshopRole({
    role: profile.role,
    phone: profile.phone,
    name: profile.name,
    shopId: profile.shopId
  });
  if (!isOwnerRole(role)) {
    redirect(getRoleHomePath(role));
  }
  const shop = profile.shopId ? await ShopRepo.getById(profile.shopId) : null;

  if (role === "SHOP_OWNER") {
    const onboardingDone =
      profile.onboardingStatus === "COMPLETE" ||
      profile.onboardingStatus === "SHOP_ACTIVE";
    if (
      profile.status === "PENDING_APPROVAL" ||
      profile.onboardingStatus === "SHOP_REGISTRATION_STARTED" ||
      profile.onboardingStatus === "SHOP_PENDING_APPROVAL" ||
      (!onboardingDone && (!shop || shop.shopStatus !== "ACTIVE"))
    ) {
      redirect("/partner/pending");
    }
  }

  const allowlist = process.env.ADMIN_PHONE_ALLOWLIST;
  if (allowlist) {
    const phones = allowlist.split(",").map((e) => e.trim()).filter(Boolean);
    if (phones.length > 0 && !phones.includes(profile.phone)) {
      canEdit = false;
      reason = "Read-only access: your phone is not in ADMIN_PHONE_ALLOWLIST.";
    }
  }

  const navGroups = getAdminNavGroups({ role, canEdit });

  return (
    <AdminUiProvider canEdit={canEdit} reason={reason} role={role}>
      <TooltipProvider delayDuration={300}>
        <WorkspaceShell navGroups={navGroups} title="Admin Console" user={{ name: profile.name, role }} shopName={shop?.name || "CycleDesk"} shopRole={role}>
          <SessionInactivityGuard />
          {children}
        </WorkspaceShell>
      </TooltipProvider>
    </AdminUiProvider>
  );
}
