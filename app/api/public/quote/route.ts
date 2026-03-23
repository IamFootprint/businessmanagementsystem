import { NextResponse } from "next/server";
import { z } from "zod";
import { buildQuote, type PricingRule } from "@/lib/pricing/engine";
import { quoteRequestSchema } from "@/lib/pricing/schema";
import { prisma } from "@/lib/prisma";
import { getFakePricingRule, isFakeDbEnabled } from "@/lib/fake-db";
import { getPublicPackageById } from "@/lib/catalog/publicPackages";
import { ServiceItemsRepo, ensureServiceSeed } from "@/src/lib/store";
import { getRequestShopId } from "@/lib/shop/requestContext";

const pricingRuleSchema = z.object({
  calloutFeeCents: z.number().int().min(0),
  platformFeeCents: z.number().int().min(0),
  platformFeePercentBps: z.number().int().min(0).nullable().optional(),
  partsMarkupBps: z.number().int().min(0),
  travelBandRulesJson: z.array(
    z.object({
      minKm: z.number().min(0),
      maxKm: z.number().min(0).nullable(),
      feeCents: z.number().int().min(0),
      label: z.string().optional()
    })
  ),
  afterHoursEnabled: z.boolean(),
  afterHoursSurchargeBps: z.number().int().min(0)
});

const DEFAULT_PRICING_RULE: PricingRule = {
  calloutFeeCents: 25000,
  platformFeeCents: 1500,
  platformFeePercentBps: null,
  partsMarkupBps: 1000,
  travelBandRulesJson: [
    { minKm: 0, maxKm: 10, feeCents: 0, label: "0-10 km" },
    { minKm: 10, maxKm: 25, feeCents: 5000, label: "10-25 km" },
    { minKm: 25, maxKm: null, feeCents: 12000, label: "25+ km" }
  ],
  afterHoursEnabled: false,
  afterHoursSurchargeBps: 1500
};

type QuoteTarget = {
  id: string;
  name: string;
  basePriceCents: number;
};

async function getActivePricingRule(): Promise<PricingRule> {
  if (isFakeDbEnabled()) {
    const fakeRule = await getFakePricingRule();
    const parsedFake = pricingRuleSchema.safeParse(fakeRule);
    if (parsedFake.success) {
      return parsedFake.data;
    }
  }

  try {
    const shopId = await getRequestShopId();
    const dbRule = await prisma.pricingRule.findFirst({
      where: { isActive: true, effectiveFrom: { lte: new Date() }, shopId },
      orderBy: { effectiveFrom: "desc" }
    });
    const parsedDb = pricingRuleSchema.safeParse(dbRule);
    if (parsedDb.success) {
      return parsedDb.data;
    }
  } catch {
    // Fall through to default pricing rule.
  }

  return DEFAULT_PRICING_RULE;
}

async function resolveQuoteTarget(itemId: string, isPackageRequest: boolean): Promise<QuoteTarget | null> {
  if (!isPackageRequest) {
    await ensureServiceSeed();
    const service = await ServiceItemsRepo.get(itemId);
    if (!service || !service.isActive) return null;
    return {
      id: service.id,
      name: service.name,
      basePriceCents: service.basePriceCents
    };
  }

  const pkg = await getPublicPackageById(itemId);
  if (!pkg) return null;

  return {
    id: pkg.id,
    name: pkg.name,
    basePriceCents: pkg.priceCents
  };
}

export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  const parsed = quoteRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Invalid quote request." } },
      { status: 400 }
    );
  }

  const itemId = parsed.data.itemId || parsed.data.packageId;
  const isPackageRequest = parsed.data.itemType === "package" || Boolean(parsed.data.packageId);
  if (!itemId) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Service selection is required." } },
      { status: 400 }
    );
  }

  const target = await resolveQuoteTarget(itemId, isPackageRequest);
  if (!target) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: isPackageRequest ? "Package not available." : "Service not available."
        }
      },
      { status: 404 }
    );
  }

  const pricingRule = await getActivePricingRule();
  const quote = buildQuote({
    basePriceCents: target.basePriceCents,
    distanceKm: parsed.data.distanceKm,
    addOnsCents: parsed.data.addOnsCents,
    consumablesCents: parsed.data.consumablesCents,
    partsCents: parsed.data.partsCents,
    afterHours: parsed.data.afterHours,
    pricingRule
  });

  return NextResponse.json(quote);
}
