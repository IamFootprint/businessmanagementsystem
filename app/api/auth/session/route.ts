import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LOCAL_SESSION_COOKIE, getProfileForSession } from "@/src/lib/auth/localSession";
import { maskPhone } from "@/lib/auth/phone";

export async function GET() {
  const sessionId = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json({ authenticated: false });
  }

  const profile = await getProfileForSession(sessionId);
  if (!profile || profile.status !== "ACTIVE") {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    phone: profile.phone ? maskPhone(profile.phone) : undefined,
  });
}
