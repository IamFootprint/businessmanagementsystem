import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logApiAccess } from "@/lib/log";

export async function GET(req: Request) {
  logApiAccess(req, "db");
  try {
    await prisma.shop.findFirst();
    return NextResponse.json(
      { ok: true },
      { headers: { "x-data-source": "db", "x-cycledesk-data-source": "db" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 500, headers: { "x-data-source": "db", "x-cycledesk-data-source": "db" } }
    );
  }
}
