import assert from "node:assert/strict";
import { buildQuote, PricingRule } from "@/lib/pricing/engine";

const baseRule: PricingRule = {
  calloutFeeCents: 25000,
  platformFeeCents: 1500,
  platformFeePercentBps: null,
  partsMarkupBps: 1000,
  travelBandRulesJson: [
    { minKm: 0, maxKm: 5, feeCents: 0, label: "0–5 km" },
    { minKm: 5, maxKm: 10, feeCents: 3500, label: "5–10 km" },
    { minKm: 10, maxKm: 20, feeCents: 7000, label: "10–20 km" },
    { minKm: 20, maxKm: 30, feeCents: 12000, label: "20–30 km" },
    { minKm: 30, maxKm: null, feeCents: 20000, label: "30+ km" }
  ],
  afterHoursEnabled: false,
  afterHoursSurchargeBps: 1500
};

function findAmount(items: { code: string; amountCents: number }[], code: string) {
  return items.find((item) => item.code === code)?.amountCents ?? 0;
}

function run() {
  {
    const quote = buildQuote({ basePriceCents: 10000, pricingRule: baseRule });
    assert.equal(findAmount(quote.lineItems, "service_fee"), 10000);
    assert.equal(findAmount(quote.lineItems, "callout_fee"), 25000);
    assert.equal(findAmount(quote.lineItems, "platform_fee"), 1500);
    assert.equal(quote.totalCents, 36500);
  }

  {
    const quote = buildQuote({
      basePriceCents: 10000,
      distanceKm: 12,
      pricingRule: baseRule
    });
    assert.equal(findAmount(quote.lineItems, "travel_fee"), 7000);
  }

  {
    const rule = { ...baseRule, afterHoursEnabled: true };
    const quote = buildQuote({
      basePriceCents: 10000,
      afterHours: true,
      pricingRule: rule
    });
    assert.equal(findAmount(quote.lineItems, "after_hours"), 5250);
  }

  {
    const quote = buildQuote({
      basePriceCents: 10000,
      addOnsCents: 5000,
      consumablesCents: 2000,
      partsCents: 20000,
      pricingRule: baseRule
    });
    assert.equal(findAmount(quote.lineItems, "add_ons"), 5000);
    assert.equal(findAmount(quote.lineItems, "consumables"), 2000);
    assert.equal(findAmount(quote.lineItems, "parts"), 20000);
    assert.equal(findAmount(quote.lineItems, "parts_markup"), 2000);
  }

  {
    const rule = { ...baseRule, platformFeeCents: 0, platformFeePercentBps: 500 };
    const quote = buildQuote({ basePriceCents: 10000, pricingRule: rule });
    assert.equal(findAmount(quote.lineItems, "platform_fee"), 1750);
  }

  {
    const rule = {
      ...baseRule,
      calloutFeeCents: 0,
      platformFeeCents: 0,
      partsMarkupBps: 0
    };
    const quote = buildQuote({ basePriceCents: 10001, pricingRule: rule });
    assert.equal(findAmount(quote.lineItems, "rounding"), -1);
    assert.equal(quote.totalCents, 10000);
  }
}

run();
console.log("pricing tests passed");
