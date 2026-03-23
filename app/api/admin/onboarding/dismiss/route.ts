import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { ShopRepo } from "@/src/lib/store";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const shop = await ShopRepo.getById(auth.shopId!);
  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const existing = shop.onboardingChecklist || { completedItems: [] };
  await ShopRepo.update(auth.shopId!, {
    onboardingChecklist: {
      ...existing,
      dismissedAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}
