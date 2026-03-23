import { describe, it, expect } from "vitest";
import { buildQuote, type PricingRule } from "./engine";

const BASE_RULE: PricingRule = {
  calloutFeeCents: 15000,
  platformFeeCents: 0,
  platformFeePercentBps: null,
  partsMarkupBps: 1500, // 15%
  travelBandRulesJson: [
    { minKm: 0, maxKm: 10, feeCents: 0, label: "0–10 km" },
    { minKm: 10, maxKm: 25, feeCents: 5000, label: "10–25 km" },
    { minKm: 25, maxKm: null, feeCents: 10000, label: "25+ km" },
  ],
  afterHoursEnabled: true,
  afterHoursSurchargeBps: 2000, // 20%
};

describe("buildQuote", () => {
  it("returns a service fee line item with correct base price", () => {
    const result = buildQuote({ basePriceCents: 35000, pricingRule: BASE_RULE });
    const serviceFee = result.lineItems.find((i) => i.code === "service_fee");
    expect(serviceFee).toBeDefined();
    expect(serviceFee!.amountCents).toBe(35000);
    expect(result.currency).toBe("ZAR");
  });

  it("includes callout fee when > 0", () => {
    const result = buildQuote({ basePriceCents: 20000, pricingRule: BASE_RULE });
    const callout = result.lineItems.find((i) => i.code === "callout_fee");
    expect(callout).toBeDefined();
    expect(callout!.amountCents).toBe(15000);
  });

  it("omits callout fee when 0", () => {
    const rule = { ...BASE_RULE, calloutFeeCents: 0 };
    const result = buildQuote({ basePriceCents: 20000, pricingRule: rule });
    expect(result.lineItems.find((i) => i.code === "callout_fee")).toBeUndefined();
  });

  it("applies travel fee based on distance band", () => {
    const result = buildQuote({ basePriceCents: 20000, distanceKm: 15, pricingRule: BASE_RULE });
    const travel = result.lineItems.find((i) => i.code === "travel_fee");
    expect(travel).toBeDefined();
    expect(travel!.amountCents).toBe(5000);
    expect(travel!.label).toContain("10–25 km");
  });

  it("uses the last band as fallback for large distances", () => {
    const result = buildQuote({ basePriceCents: 20000, distanceKm: 100, pricingRule: BASE_RULE });
    const travel = result.lineItems.find((i) => i.code === "travel_fee");
    expect(travel).toBeDefined();
    expect(travel!.amountCents).toBe(10000);
  });

  it("omits travel fee within free band (0–10 km)", () => {
    const result = buildQuote({ basePriceCents: 20000, distanceKm: 5, pricingRule: BASE_RULE });
    expect(result.lineItems.find((i) => i.code === "travel_fee")).toBeUndefined();
  });

  it("calculates parts markup correctly", () => {
    const result = buildQuote({
      basePriceCents: 20000,
      partsCents: 10000,
      pricingRule: BASE_RULE,
    });
    const parts = result.lineItems.find((i) => i.code === "parts");
    const markup = result.lineItems.find((i) => i.code === "parts_markup");
    expect(parts!.amountCents).toBe(10000);
    expect(markup).toBeDefined();
    // 15% of 10000 = 1500
    expect(markup!.amountCents).toBe(1500);
    expect(markup!.label).toContain("15%");
  });

  it("applies after-hours surcharge on base items", () => {
    const result = buildQuote({
      basePriceCents: 20000,
      afterHours: true,
      pricingRule: BASE_RULE,
    });
    const surcharge = result.lineItems.find((i) => i.code === "after_hours");
    expect(surcharge).toBeDefined();
    // Base for surcharge: service_fee (20000) + callout_fee (15000) = 35000
    // 20% of 35000 = 7000
    expect(surcharge!.amountCents).toBe(7000);
  });

  it("skips after-hours when afterHoursEnabled is false", () => {
    const rule = { ...BASE_RULE, afterHoursEnabled: false };
    const result = buildQuote({ basePriceCents: 20000, afterHours: true, pricingRule: rule });
    expect(result.lineItems.find((i) => i.code === "after_hours")).toBeUndefined();
  });

  it("rounds total to nearest R5 (500 cents)", () => {
    // Service: 20000 + Callout: 15000 = 35000 — already a multiple of 500
    const result = buildQuote({ basePriceCents: 20000, pricingRule: BASE_RULE });
    expect(result.totalCents % 500).toBe(0);
  });

  it("adds rounding adjustment line item when total is not a multiple of R5", () => {
    // Service: 12345 + Callout: 15000 = 27345 → rounds to 27500 → delta = 155
    const result = buildQuote({ basePriceCents: 12345, pricingRule: BASE_RULE });
    const rounding = result.lineItems.find((i) => i.code === "rounding");
    expect(rounding).toBeDefined();
    expect(result.totalCents % 500).toBe(0);
    expect(result.totalCents).toBe(result.subtotalCents + rounding!.amountCents);
  });

  it("includes platform fee as percentage when platformFeePercentBps is set", () => {
    const rule: PricingRule = { ...BASE_RULE, platformFeePercentBps: 500 }; // 5%
    const result = buildQuote({ basePriceCents: 20000, pricingRule: rule });
    const platform = result.lineItems.find((i) => i.code === "platform_fee");
    expect(platform).toBeDefined();
    // 5% of (service 20000 + callout 15000) = 1750
    expect(platform!.amountCents).toBe(1750);
    expect(platform!.label).toContain("5%");
  });

  it("includes platform fee as flat amount when platformFeeCents is set", () => {
    const rule: PricingRule = { ...BASE_RULE, platformFeeCents: 2500, platformFeePercentBps: null };
    const result = buildQuote({ basePriceCents: 20000, pricingRule: rule });
    const platform = result.lineItems.find((i) => i.code === "platform_fee");
    expect(platform).toBeDefined();
    expect(platform!.amountCents).toBe(2500);
  });
});
