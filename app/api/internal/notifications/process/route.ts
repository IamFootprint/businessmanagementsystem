import { NextResponse } from "next/server";
import { processNotificationQueue } from "@/lib/notifications/processor";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.INTERNAL_API_TOKEN || "cycledesk-internal";
  const isCron = request.headers.get("x-vercel-cron") === "true";

  if (!isCron && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processNotificationQueue();
  return NextResponse.json({ ok: true, ...result });
}
