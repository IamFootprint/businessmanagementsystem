import { NextResponse } from "next/server";
import { ProfilesRepo } from "@/src/lib/store";
import { getRequestShopId } from "@/lib/shop/requestContext";

export async function GET() {
  const shopId = await getRequestShopId();
  const mechanics = await ProfilesRepo.listMechanics(shopId);
  const active = mechanics
    .filter((mechanic) => mechanic.status === "ACTIVE")
    .map((mechanic) => ({
      id: mechanic.id,
      name: mechanic.name,
      phone: mechanic.phone
    }));
  return NextResponse.json({ mechanics: active });
}
