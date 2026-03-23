import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ToolsPageClient from "./ToolsPageClient";
import { LOCAL_SESSION_COOKIE } from "@/src/lib/auth/localSession";
import { getProfileForSession } from "@/src/lib/store";
import { getRoleHomePath } from "@/src/lib/auth/roleRouting";
import { isOwnerRole, resolveWorkshopRole } from "@/src/lib/auth/roles";
import { getAdminNavGroups } from "../admin-nav";

export default async function AdminToolsPage() {
  const localSessionId = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  if (!localSessionId) {
    redirect("/login?returnTo=/admin/tools");
  }

  const profile = await getProfileForSession(localSessionId);
  if (!profile || profile.status === "INACTIVE") {
    redirect("/login?returnTo=/admin/tools");
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

  let canEdit = true;
  const allowlist = process.env.ADMIN_PHONE_ALLOWLIST;
  if (allowlist) {
    const phones = allowlist.split(",").map((entry) => entry.trim()).filter(Boolean);
    if (phones.length > 0 && !phones.includes(profile.phone)) {
      canEdit = false;
    }
  }

  const groups = getAdminNavGroups({ role, canEdit });
  return <ToolsPageClient groups={groups} />;
}
