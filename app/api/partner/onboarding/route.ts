import { z } from "zod";
import { requireSession } from "@/src/lib/auth/localSession";
import { ProfilesRepo, ServiceItemsRepo, ShopRepo } from "@/src/lib/store";
import { logAudit } from "@/lib/admin/audit";
import { ok, badRequest, forbidden, serverError } from "@/lib/api/responses";

const onboardingSchema = z.object({
  shopName: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  whatsappNumber: z.string().min(10),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function uniqueSlug(base: string) {
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `${base}-${suffix}`;
}

const DEFAULT_WORKING_HOURS = [
  { day: "Mon", start: "08:00", end: "18:00", active: true },
  { day: "Tue", start: "08:00", end: "18:00", active: true },
  { day: "Wed", start: "08:00", end: "18:00", active: true },
  { day: "Thu", start: "08:00", end: "18:00", active: true },
  { day: "Fri", start: "08:00", end: "18:00", active: true },
  { day: "Sat", start: "08:00", end: "18:00", active: true },
  { day: "Sun", start: "08:00", end: "18:00", active: false },
];

async function seedStarterCatalogue(shopId: string) {
  const existing = await ServiceItemsRepo.list(shopId);
  if (existing.length > 0) return;
  const starters = [
    ["Minor Tune-up", "Safety checks plus drivetrain and brake tune.", 85000, 90, "tune"],
    ["Standard Service", "Deeper clean, indexing, wheel true, and control check.", 125000, 120, "service"],
    ["Major Service", "Comprehensive strip-down and rebuild tune.", 175000, 180, "service"],
    ["Brake Overhaul", "Hydraulic bleed, pad inspection and rotor alignment.", 95000, 90, "brakes"],
    ["Drivetrain Refresh", "Chain wear check, cassette clean, indexing reset.", 110000, 90, "drivetrain"]
  ] as const;

  for (const [name, description, basePriceCents, durationMins, category] of starters) {
    await ServiceItemsRepo.create({
      name,
      description,
      basePriceCents,
      durationMins,
      category,
      isActive: true,
      sortOrder: starters.findIndex((entry) => entry[0] === name) + 1,
      shopId
    });
  }
}

export async function POST(request: Request) {
  const session = await requireSession({ allowStatuses: ["ACTIVE", "PENDING_APPROVAL"] });
  if (!session.ok) return session.response;

  const payload = await request.json().catch(() => ({}));
  const parsed = onboardingSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_INPUT", "Please provide shop name, city, and WhatsApp number.");
  }

  const { shopName, city, whatsappNumber } = parsed.data;
  const baseSlug = slugify(shopName) || "cycle-shop";
  const slug = uniqueSlug(baseSlug);

  const shop = await ShopRepo.create({
    name: shopName.trim(),
    slug,
    phone: whatsappNumber,
    whatsapp: whatsappNumber,
    createdByProfileId: session.profile.id,
    shopStatus: "ACTIVE",
    businessDetails: {
      name: shopName.trim(),
      address: "",
      city: city.trim(),
      contactEmail: "",
      contactPhone: whatsappNumber,
    },
    operationalDefaults: {
      noticeHours: 24,
      assignmentMode: "AUTO",
      workingHours: DEFAULT_WORKING_HOURS,
    },
    serviceModels: {
      fixedLocation: { enabled: false },
      mobileMechanic: {
        enabled: true,
        serviceRadiusKm: 25,
        calloutFeeCents: 15000,
        travelBufferMins: 30,
      },
    },
    submittedAtIso: new Date().toISOString(),
    approvedAtIso: new Date().toISOString(),
  });

  if (!shop) {
    return serverError("SHOP_SAVE_FAILED", "Unable to save shop onboarding.");
  }

  // Seed starter catalogue
  await seedStarterCatalogue(shop.id);

  // Update profile: owner, active, onboarding complete
  await ProfilesRepo.update(session.profile.id, {
    role: "SHOP_OWNER",
    shopId: shop.id,
    status: "ACTIVE",
    onboardingStatus: "COMPLETE",
  });

  // Best-effort: create mechanic profile for the shop's WhatsApp number.
  // Skip if it's the same phone as the owner to avoid overwriting SHOP_OWNER role
  // (upsertByPhone would clobber the existing profile).
  if (whatsappNumber !== session.profile.phone) {
    try {
      await ProfilesRepo.upsertByPhone({
        phone: whatsappNumber,
        name: session.profile.name,
        role: "MECHANIC",
        status: "ACTIVE",
        shopId: shop.id,
      });
    } catch {
      // non-critical — ignore
    }
  }

  await logAudit({
    actor: session.profile.phone,
    action: "shop.registration.completed",
    entity: "shop",
    entityId: shop.id,
    shopId: shop.id,
    metadata: {
      shopName: shop.name,
      city,
      selfService: true,
    },
  });

  return ok({ ok: true, shopId: shop.id, shopSlug: shop.slug, redirect: "/admin" });
}
