export type TravelBandRule = {
  minKm: number;
  maxKm: number | null;
  feeCents: number;
  label?: string;
};

export type PricingRule = {
  calloutFeeCents: number;
  platformFeeCents: number;
  platformFeePercentBps?: number | null;
  partsMarkupBps: number;
  travelBandRulesJson: TravelBandRule[];
  afterHoursEnabled: boolean;
  afterHoursSurchargeBps: number;
};

export type QuoteLineItem = {
  code: string;
  label: string;
  amountCents: number;
};

export type QuoteResult = {
  lineItems: QuoteLineItem[];
  subtotalCents: number;
  totalCents: number;
  currency: "ZAR";
};

type QuoteInput = {
  basePriceCents: number;
  distanceKm?: number | null;
  addOnsCents?: number | null;
  consumablesCents?: number | null;
  partsCents?: number | null;
  afterHours?: boolean;
  pricingRule: PricingRule;
};

const ROUNDING_STEP_CENTS = 500;

function toInt(value: number) {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function roundToNearest(valueCents: number, stepCents = ROUNDING_STEP_CENTS) {
  if (!Number.isFinite(valueCents) || stepCents <= 0) return valueCents;
  return Math.round(valueCents / stepCents) * stepCents;
}

function findTravelBand(distanceKm: number, rules: TravelBandRule[]) {
  if (!Array.isArray(rules) || rules.length === 0) return null;
  return (
    rules.find((rule) => {
      const max = rule.maxKm ?? Infinity;
      return distanceKm >= rule.minKm && distanceKm < max;
    }) || rules[rules.length - 1]
  );
}

function formatPercentLabel(bps: number) {
  const percent = (bps / 100).toFixed(1);
  return `${percent.replace(/\.0$/, "")}%`;
}

export function buildQuote(input: QuoteInput): QuoteResult {
  const lineItems: QuoteLineItem[] = [];
  const basePrice = Math.max(0, toInt(input.basePriceCents));
  const rule = input.pricingRule;

  lineItems.push({ code: "service_fee", label: "Service fee", amountCents: basePrice });

  const calloutFee = Math.max(0, toInt(rule.calloutFeeCents));
  if (calloutFee > 0) {
    lineItems.push({ code: "callout_fee", label: "Call-out fee", amountCents: calloutFee });
  }

  const distanceKm = input.distanceKm ?? null;
  if (typeof distanceKm === "number" && distanceKm >= 0) {
    const band = findTravelBand(distanceKm, rule.travelBandRulesJson);
    if (band && band.feeCents > 0) {
      const label = band.label ? `Travel fee (${band.label})` : "Travel fee";
      lineItems.push({ code: "travel_fee", label, amountCents: toInt(band.feeCents) });
    }
  }

  const addOnsCents = input.addOnsCents ?? null;
  if (typeof addOnsCents === "number" && addOnsCents > 0) {
    lineItems.push({ code: "add_ons", label: "Add-ons", amountCents: toInt(addOnsCents) });
  }

  const consumablesCents = input.consumablesCents ?? null;
  if (typeof consumablesCents === "number" && consumablesCents > 0) {
    lineItems.push({ code: "consumables", label: "Consumables", amountCents: toInt(consumablesCents) });
  }

  const partsCents = input.partsCents ?? null;
  if (typeof partsCents === "number" && partsCents > 0) {
    lineItems.push({ code: "parts", label: "Parts", amountCents: toInt(partsCents) });
    const markupBps = Math.max(0, toInt(rule.partsMarkupBps));
    if (markupBps > 0) {
      const markup = Math.round(partsCents * (markupBps / 10000));
      if (markup > 0) {
        lineItems.push({
          code: "parts_markup",
          label: `Parts markup (${formatPercentLabel(markupBps)})`,
          amountCents: markup
        });
      }
    }
  }

  const afterHours = input.afterHours === true && rule.afterHoursEnabled;
  if (afterHours) {
    const surchargeBps = Math.max(0, toInt(rule.afterHoursSurchargeBps));
    const baseForSurcharge = lineItems
      .filter((item) =>
        ["service_fee", "callout_fee", "travel_fee", "add_ons", "consumables"].includes(item.code)
      )
      .reduce((sum, item) => sum + item.amountCents, 0);
    const surcharge = Math.round(baseForSurcharge * (surchargeBps / 10000));
    if (surcharge > 0) {
      lineItems.push({
        code: "after_hours",
        label: `After-hours surcharge (${formatPercentLabel(surchargeBps)})`,
        amountCents: surcharge
      });
    }
  }

  const platformPercent = rule.platformFeePercentBps ?? null;
  const subtotalBeforePlatform = lineItems.reduce((sum, item) => sum + item.amountCents, 0);
  if (platformPercent && platformPercent > 0) {
    const platformFee = Math.round(subtotalBeforePlatform * (platformPercent / 10000));
    if (platformFee > 0) {
      lineItems.push({
        code: "platform_fee",
        label: `Platform fee (${formatPercentLabel(platformPercent)})`,
        amountCents: platformFee
      });
    }
  } else if (rule.platformFeeCents > 0) {
    lineItems.push({
      code: "platform_fee",
      label: "Platform fee",
      amountCents: toInt(rule.platformFeeCents)
    });
  }

  const subtotalCents = lineItems.reduce((sum, item) => sum + item.amountCents, 0);
  const roundedTotal = roundToNearest(subtotalCents);
  const roundingDelta = roundedTotal - subtotalCents;
  if (roundingDelta !== 0) {
    lineItems.push({
      code: "rounding",
      label: "Rounding adjustment",
      amountCents: roundingDelta
    });
  }

  return {
    lineItems,
    subtotalCents,
    totalCents: subtotalCents + roundingDelta,
    currency: "ZAR"
  };
}
