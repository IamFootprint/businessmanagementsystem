import { NextRequest, NextResponse } from "next/server";
import { ShopRepo } from "@/src/lib/store";

export async function POST(
  _req: NextRequest,
  { params }: { params: { shopSlug: string } }
) {
  const shop = await ShopRepo.getBySlug(params.shopSlug);
  if (!shop || shop.shopStatus !== "ACTIVE") {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }
  if (!shop.widgetConfig?.installedAt) {
    const updatedWidgetConfig = {
      ...shop.widgetConfig,
      authorizedDomains: shop.widgetConfig?.authorizedDomains || [],
      installedAt: new Date().toISOString(),
    };
    const checklist = shop.onboardingChecklist || { completedItems: [] };
    if (!checklist.completedItems.includes("widget_installed")) {
      checklist.completedItems = [...checklist.completedItems, "widget_installed"];
    }
    // Single update call
    await ShopRepo.update(shop.id, {
      widgetConfig: updatedWidgetConfig,
      onboardingChecklist: checklist,
    });
  }
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
      },
    }
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
