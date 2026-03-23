import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LOCAL_SESSION_COOKIE } from "@/src/lib/auth/localSession";
import { getProfileForSession, removeSession } from "@/src/lib/store";
import { logAuditEvent } from "@/lib/audit/service";

export async function POST(request: Request) {
  const sessionId = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  const payload = await request.json().catch(() => ({}));
  const reason = typeof payload.reason === "string" ? payload.reason : "MANUAL";
  const profile = sessionId ? await getProfileForSession(sessionId) : null;

  const response = NextResponse.json({ ok: true });
  // Clear primary session cookie
  response.cookies.set(LOCAL_SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  // Clear legacy cookies that may still exist in user browsers
  response.cookies.set("cyc_session", "", { httpOnly: true, maxAge: 0, path: "/" });
  response.cookies.set("cyc_pending_phone", "", { httpOnly: true, maxAge: 0, path: "/" });
  response.cookies.set("cyc_pending_marker", "", { httpOnly: true, maxAge: 0, path: "/" });
  if (sessionId) {
    await removeSession(sessionId);
  }

  await logAuditEvent({
    eventName: reason === "INACTIVITY_TIMEOUT" ? "auth.session.timeout_logout" : "auth.logout",
    eventCategory: "auth",
    action: "logout",
    outcome: "success",
    actor: profile
      ? {
          type: "user",
          id: profile.id,
          display: profile.phone,
          role: profile.role
        }
      : { type: "system", display: "anonymous" },
    target: {
      type: "auth_session",
      id: sessionId || null,
      display: sessionId || "session"
    },
    reasonCode: reason,
    reasonText: reason,
    contextJson: { reason },
    shopId: profile?.shopId || null,
    isSensitive: true,
    retentionClass: "security"
  }, request);

  return response;
}
