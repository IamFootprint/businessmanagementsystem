import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCAL_SESSION_COOKIE } from "@/src/lib/auth/localSession";
import { getProfileForSession } from "@/src/lib/store";

export default async function MechIndexPage() {
  const sessionId = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  if (!sessionId) {
    redirect("/login?returnTo=/mech");
  }
  const profile = await getProfileForSession(sessionId);
  if (!profile || profile.status !== "ACTIVE") {
    redirect("/login?returnTo=/mech");
  }
  if (profile.onboardingStatus === "MECHANIC_PROFILE_INCOMPLETE") {
    redirect("/mech/profile");
  }
  redirect("/mech/today");
}
