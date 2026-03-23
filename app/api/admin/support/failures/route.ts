import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  return NextResponse.json({ failures: [] });
}
