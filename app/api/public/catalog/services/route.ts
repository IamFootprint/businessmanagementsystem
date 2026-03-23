import { NextResponse } from "next/server";
import { ServiceItemsRepo, ensureServiceSeed } from "@/src/lib/store";
import { getRequestShopId } from "@/lib/shop/requestContext";

export async function GET() {
  await ensureServiceSeed();
  const shopId = await getRequestShopId();
  const services = await ServiceItemsRepo.listActive(shopId);
  const mapped = services.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    durationMinutes: item.durationMins,
    priceCents: item.basePriceCents,
    category: item.category,
    sortOrder: item.sortOrder,
  }));
  return NextResponse.json({ services: mapped });
}
