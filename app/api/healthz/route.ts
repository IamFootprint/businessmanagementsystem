import { NextResponse } from "next/server";
import { logRequest } from "@/lib/log";

export async function GET(req: Request) {
  logRequest(req);
  return NextResponse.json({ ok: true });
}
