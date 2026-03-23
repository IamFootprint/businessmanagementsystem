import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/localSession";
import { BikesRepo } from "@/src/lib/store";
import { logAuditEvent } from "@/lib/audit/service";
import { resolveActorFromSession } from "@/lib/audit/resolveActor";

const bikeSchema = z.object({
  bikeType: z.enum(["MTB", "ROAD", "GRAVEL", "E_BIKE", "OTHER"]),
  brand: z.string().min(1),
  model: z.string().optional(),
  drivetrainType: z.string().optional(),
  brakeType: z.string().optional(),
  eBike: z.boolean().optional(),
  notes: z.string().optional()
});

export async function GET(request: Request) {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const targetProfileId = auth.profile.id;

  const bikes = await BikesRepo.listByCustomer(targetProfileId);
  return NextResponse.json({ bikes });
}

export async function POST(request: Request) {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const payload = await request.json().catch(() => ({}));
  const parsed = bikeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Invalid bike details." } },
      { status: 400 }
    );
  }

  const bike = await BikesRepo.create({
    customerProfileId: auth.profile.id,
    bikeType: parsed.data.bikeType,
    brand: parsed.data.brand,
    model: parsed.data.model,
    drivetrainType: parsed.data.drivetrainType,
    brakeType: parsed.data.brakeType,
    eBike: parsed.data.eBike ?? parsed.data.bikeType === "E_BIKE",
    notes: parsed.data.notes
  });

  await logAuditEvent({
    eventName: "profile.bike.created",
    eventCategory: "profile",
    action: "create",
    actor: resolveActorFromSession(auth.profile),
    target: {
      type: "bike",
      id: bike.id,
      display: `${bike.brand} ${bike.model || ""}`.trim()
    },
    afterJson: bike,
    contextJson: { bikeType: bike.bikeType },
    shopId: auth.profile.shopId || null
  }, request);

  return NextResponse.json({ bike });
}
