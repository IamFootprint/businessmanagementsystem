import { NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/localSession";
import {
  JobCardsRepo,
  listJobCardsByDate,
  listJobCardsByMechanicAndDate,
  toDateIso
} from "@/src/lib/store";

export async function GET(req: Request) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("date");
  const dateIso = requested && /^\\d{4}-\\d{2}-\\d{2}$/.test(requested)
    ? requested
    : toDateIso(new Date().toISOString());
  const jobCards =
    auth.profile.role === "MECHANIC"
      ? await listJobCardsByMechanicAndDate(auth.profile.id, dateIso, auth.profile.shopId)
      : await listJobCardsByDate(dateIso, auth.profile.shopId);

  const inProgressJobCards =
    auth.profile.role === "MECHANIC"
      ? await JobCardsRepo.listInProgressByMechanic(auth.profile.id)
      : jobCards.filter((job) =>
          ["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_APPROVAL"].includes(job.status)
        );

  return NextResponse.json({ jobCards, inProgressJobCards });
}
