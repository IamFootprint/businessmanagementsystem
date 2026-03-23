import { NextRequest, NextResponse } from "next/server";
import { ShopRepo } from "@/src/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { shopSlug: string } }
) {
  const shop = await ShopRepo.getBySlug(params.shopSlug);
  if (!shop || shop.shopStatus !== "ACTIVE") {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }
  const config = {
    shopName: shop.name,
    shopSlug: shop.slug,
    primaryColor: shop.themeTokens?.primaryColor || "#1a6b5a",
    logoUrl: shop.themeTokens?.logo || null,
    buttonLabel: shop.widgetConfig?.buttonLabel || "Book Now",
    buttonColor:
      shop.widgetConfig?.buttonColor ||
      shop.themeTokens?.primaryColor ||
      "#1a6b5a",
    buttonPosition: shop.widgetConfig?.buttonPosition || "bottom-right",
    hideFab: shop.widgetConfig?.hideFab || false,
  };
  return NextResponse.json(config, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
