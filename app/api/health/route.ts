import { NextResponse } from "next/server";
import { logApiAccess } from "@/lib/log";
import { isFakeDbEnabled } from "@/lib/fake-db";

export async function GET(req: Request) {
  const source = isFakeDbEnabled() ? "fixtures" : "db";
  logApiAccess(req, source);
  return NextResponse.json(
    { ok: true },
    { headers: { "x-data-source": source, "x-cycledesk-data-source": source } }
  );
}
