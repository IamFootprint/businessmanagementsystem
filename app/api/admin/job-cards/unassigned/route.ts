import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { JobCardsRepo } from "@/src/lib/store";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const cards = await JobCardsRepo.list(auth.shopId!);
  const unassigned = cards.filter(
    (card) =>
      !card.assignedMechanicId &&
      card.status !== "COMPLETED" &&
      card.status !== "CANCELLED"
  );
  return NextResponse.json({ jobCards: unassigned });
}
