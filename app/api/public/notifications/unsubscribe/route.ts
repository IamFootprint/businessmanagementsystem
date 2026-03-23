import { NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe";
import { ProfilesRepo } from "@/src/lib/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new NextResponse("Missing token.", { status: 400 });
  }

  const parsed = verifyUnsubscribeToken(token);
  if (!parsed) {
    return new NextResponse("Invalid or expired link.", { status: 400 });
  }

  const profile = await ProfilesRepo.getById(parsed.profileId);
  if (!profile) {
    return new NextResponse("Profile not found.", { status: 404 });
  }

  const prefs = profile.notificationPreferences || {
    whatsappOptOut: false,
    emailOptOut: false,
    updatedAtIso: new Date().toISOString(),
  };

  if (parsed.channel === "WHATSAPP") {
    prefs.whatsappOptOut = true;
  } else if (parsed.channel === "EMAIL") {
    prefs.emailOptOut = true;
  }
  prefs.updatedAtIso = new Date().toISOString();

  await ProfilesRepo.update(profile.id, { notificationPreferences: prefs });

  return new NextResponse(
    `<html><body style="font-family:sans-serif;text-align:center;padding:4rem">
      <h2>Unsubscribed</h2>
      <p>You have been unsubscribed from ${parsed.channel.toLowerCase()} notifications.</p>
      <p>You can re-enable notifications in your account settings.</p>
    </body></html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  );
}
