import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { LeadsRepo } from "@/src/lib/store";

export async function GET() {
  const check = await requireAdmin();
  if (!check.ok) return check.response;
  const leads = await LeadsRepo.list();
  return NextResponse.json({ leads });
}
