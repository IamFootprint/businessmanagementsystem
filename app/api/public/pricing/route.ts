import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logApiAccess, logError } from "@/lib/log";
import { getFakePricingRule, isFakeDbEnabled } from "@/lib/fake-db";
import { getRequestShopId } from "@/lib/shop/requestContext";

export async function GET(req: Request) {
  const source = isFakeDbEnabled() ? "fixtures" : "db";
  logApiAccess(req, source);

  try {
    if (isFakeDbEnabled()) {
      const rule = await getFakePricingRule();
      return NextResponse.json(
        { rule },
        { headers: { "x-data-source": source, "x-cycledesk-data-source": source } }
      );
    }

    const shopId = await getRequestShopId();
    const rule = await prisma.pricingRule.findFirst({
      where: { isActive: true, effectiveFrom: { lte: new Date() }, shopId },
      orderBy: { effectiveFrom: "desc" }
    });

    if (!rule) {
      return NextResponse.json(
        { error: "No active pricing rules found." },
        { status: 404, headers: { "x-data-source": source, "x-cycledesk-data-source": source } }
      );
    }

    return NextResponse.json(
      { rule },
      { headers: { "x-data-source": source, "x-cycledesk-data-source": source } }
    );
  } catch (error) {
    logError("pricing_fetch_failed", error);
    return NextResponse.json(
      { error: "Failed to load pricing rules." },
      { status: 500, headers: { "x-data-source": source, "x-cycledesk-data-source": source } }
    );
  }
}
