import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCAL_SESSION_COOKIE } from "@/src/lib/auth/localSession";
import { getProfileForSession } from "@/src/lib/store";
import { resolveWorkshopRole } from "@/src/lib/auth/roles";

export default async function PlatformEntryPage() {
  const sessionId = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  if (!sessionId) {
    redirect("/login?returnTo=/platform");
  }
  const profile = await getProfileForSession(sessionId);
  if (!profile || profile.status !== "ACTIVE") {
    redirect("/login?returnTo=/platform");
  }
  const role = resolveWorkshopRole({
    role: profile.role,
    phone: profile.phone,
    name: profile.name,
    shopId: profile.shopId
  });
  if (role !== "PLATFORM_OWNER") {
    redirect("/admin");
  }
  redirect("/admin/platform/shops");
}
