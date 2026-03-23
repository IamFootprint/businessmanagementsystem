import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFakeShop, isFakeDbEnabled } from "@/lib/fake-db";

const fallbackShop = {
  name: "CycleDesk",
  whatsapp: "",
  phone: "",
  email: "",
  baseLocation: "",
  themeTokens: {}
};

export async function GET() {
  let payload: Record<string, unknown> = fallbackShop;
  const source = isFakeDbEnabled() ? "fixtures" : "db";

  if (isFakeDbEnabled()) {
    payload = (await getFakeShop()) || fallbackShop;
  } else {
    try {
      const shop = await prisma.shop.findFirst();
      if (shop) {
        payload = {
          name: shop.name,
          phone: shop.phone,
          whatsapp: shop.whatsapp,
          email: shop.email,
          baseLocation: shop.baseLocation,
          businessHours: shop.businessHours,
          themeTokens: shop.themeTokens || {}
        };
      }
    } catch {
      payload = fallbackShop;
    }
  }

  const response = NextResponse.json({
    ...payload,
    shop: payload
  });
  response.headers.set(
    "x-cycledesk-data-source",
    source
  );
  return response;
}
