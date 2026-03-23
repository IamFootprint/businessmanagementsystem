import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { logAudit } from "@/lib/admin/audit";
import { ok, badRequest, serverError } from "@/lib/api/responses";
import { PricingRulesRepo } from "@/src/lib/store";

const pricingSchema = z.object({
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
  afterHoursSurchargeBps: z.number().int().min(0),
  effectiveFrom: z.string().datetime(),
  isActive: z.boolean()
});

const DEFAULT_ID = "pricing_rule_default";

function defaultPricingPayload(shopId: string) {
  return {
    id: DEFAULT_ID,
    shopId,
    calloutFeeCents: 25000,
    platformFeeCents: 1500,
    platformFeePercentBps: null,
    partsMarkupBps: 1000,
    travelBandRulesJson: [
      { minKm: 0, maxKm: 10, feeCents: 0, label: "0-10 km" },
      { minKm: 10, maxKm: 25, feeCents: 5000, label: "10-25 km" },
      { minKm: 25, maxKm: null, feeCents: 12000, label: "25+ km" }
    ] as Array<{ minKm: number; maxKm: number | null; feeCents: number; label: string }>,
    afterHoursEnabled: false,
    afterHoursSurchargeBps: 1500,
    effectiveFrom: new Date().toISOString(),
    isActive: true
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  try {
    let rule = await PricingRulesRepo.getActive(auth.shopId!);

    if (!rule) {
      rule = await PricingRulesRepo.upsert(defaultPricingPayload(auth.shopId!));
    }

    return ok({ rule });
  } catch {
    return serverError("PRICING_LOAD_FAILED", "Failed to load pricing rules.");
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = pricingSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_PRICING_PAYLOAD", "Invalid pricing payload.");
  }

  try {
    const data = parsed.data;
    const existing = await PricingRulesRepo.getActive(auth.shopId!);

    const updated = await PricingRulesRepo.upsert({
      id: DEFAULT_ID,
      shopId: auth.shopId!,
      calloutFeeCents: data.calloutFeeCents,
      platformFeeCents: data.platformFeeCents,
      platformFeePercentBps: data.platformFeePercentBps ?? null,
      partsMarkupBps: data.partsMarkupBps,
      travelBandRulesJson: data.travelBandRulesJson,
      afterHoursEnabled: data.afterHoursEnabled,
      afterHoursSurchargeBps: data.afterHoursSurchargeBps,
      effectiveFrom: data.effectiveFrom,
      isActive: data.isActive
    });

    const actionLabel = !existing
      ? "Created pricing rule"
      : existing.isActive && !updated.isActive
        ? "Deactivated pricing rule"
        : "Updated pricing rule";

    await logAudit({
      actor: auth.phone,
      action: !existing ? "pricing.rule.created" : "pricing.rule.updated",
      entity: "pricing_rule",
      entityId: updated.id,
      metadata: {
        actionLabel,
        actorPhone: auth.phone,
        targetDisplay: updated.id,
        diffSummary: [
          `Callout: R${Math.round(updated.calloutFeeCents / 100)}`,
          `Platform: R${Math.round(updated.platformFeeCents / 100)}`,
          `${updated.travelBandRulesJson.length} travel band(s)`,
          `After-hours: ${updated.afterHoursEnabled ? "On" : "Off"}`
        ]
      },
      shopId: auth.shopId!
    });

    return ok({ rule: updated });
  } catch {
    return serverError("PRICING_SAVE_FAILED", "Failed to save pricing rules.");
  }
}
