import { NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/localSession";
import { listJobCardsByDate, listJobCardsByMechanicAndDate, toDateIso } from "@/src/lib/store";

export async function GET() {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  const todayIso = toDateIso(new Date().toISOString());
  const jobCards =
    auth.profile.role === "MECHANIC"
      ? await listJobCardsByMechanicAndDate(auth.profile.id, todayIso, auth.profile.shopId)
      : await listJobCardsByDate(todayIso, auth.profile.shopId);

  return NextResponse.json({ jobCards });
}
