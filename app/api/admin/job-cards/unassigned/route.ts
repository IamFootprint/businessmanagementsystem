import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { JobCardsRepo } from "@/src/lib/store";
import { withShopContext } from "@/src/lib/db/shop-context";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  // withShopContext sets SET LOCAL app.current_shop_id for RLS enforcement on all
  // tenant-scoped queries within this request, regardless of store mode.
  const cards = await withShopContext(auth.shopId!, () =>
    JobCardsRepo.list(auth.shopId!)
  );
  const unassigned = cards.filter(
    (card) =>
      !card.assignedMechanicId &&
      card.status !== "COMPLETED" &&
      card.status !== "CANCELLED"
  );
  return NextResponse.json({ jobCards: unassigned });
}
