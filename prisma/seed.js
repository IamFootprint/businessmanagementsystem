const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const shop = await prisma.shop.upsert({
    where: { slug: "default" },
    update: {
      name: "ServiceMyBike Joburg",
      phone: "+27 82 123 4567",
      whatsapp: "+27 82 123 4567",
      email: "hello@servicemybikejoburg.co.za",
      baseLocation: "Johannesburg, South Africa",
      businessHours: "Mon–Sat 08:00–18:00",
      themeTokens: {
        bg: "#F6F7FB",
        surface: "#FFFFFF",
        text: "#0F172A",
        muted: "#475569",
        border: "#E2E8F0",
        accent: "#F97316",
        accentText: "#FFFFFF",
        radius: "12px"
      }
    },
    create: {
      slug: "default",
      name: "ServiceMyBike Joburg",
      phone: "+27 82 123 4567",
      whatsapp: "+27 82 123 4567",
      email: "hello@servicemybikejoburg.co.za",
      baseLocation: "Johannesburg, South Africa",
      businessHours: "Mon–Sat 08:00–18:00",
      themeTokens: {
        bg: "#F6F7FB",
        surface: "#FFFFFF",
        text: "#0F172A",
        muted: "#475569",
        border: "#E2E8F0",
        accent: "#F97316",
        accentText: "#FFFFFF",
        radius: "12px"
      }
    }
  });

  const services = [
    {
      id: "svc_minor",
      name: "Minor Service",
      description: "Quick safety check, lube, and minor adjustments.",
      durationMins: 60,
      basePriceCents: 25000,
      isActive: true,
      sortOrder: 1,
      shopId: shop.id
    },
    {
      id: "svc_standard",
      name: "Standard Service",
      description: "Brake + gear adjustment, safety check.",
      durationMins: 90,
      basePriceCents: 35000,
      isActive: true,
      sortOrder: 2,
      shopId: shop.id
    },
    {
      id: "svc_major",
      name: "Major Service",
      description: "Full tune, drivetrain clean, safety inspection.",
      durationMins: 120,
      basePriceCents: 45000,
      isActive: true,
      sortOrder: 3,
      shopId: shop.id
    },
    {
      id: "svc_brake_bleed",
      name: "Brake Bleed",
      description: "Hydraulic brake bleed and safety check.",
      durationMins: 60,
      basePriceCents: 30000,
      isActive: true,
      sortOrder: 4,
      shopId: shop.id
    },
    {
      id: "svc_gear",
      name: "Gear Indexing",
      description: "Dial-in shifting performance.",
      durationMins: 45,
      basePriceCents: 22000,
      isActive: true,
      sortOrder: 5,
      shopId: shop.id
    },
    {
      id: "svc_wheel_true",
      name: "Wheel True",
      description: "Straighten and tension wheels.",
      durationMins: 60,
      basePriceCents: 28000,
      isActive: true,
      sortOrder: 6,
      shopId: shop.id
    }
  ];

  for (const service of services) {
    await prisma.serviceItem.upsert({
      where: { id: service.id },
      update: service,
      create: service
    });
  }

  const packages = [
    {
      id: "pkg_minor",
      name: "Minor Package",
      description: "Ideal for monthly maintenance.",
      durationMinutes: 60,
      priceCents: 25000,
      isActive: true,
      sortOrder: 1,
      shopId: shop.id
    },
    {
      id: "pkg_standard",
      name: "Standard Package",
      description: "For frequent riders needing deeper tune.",
      durationMinutes: 90,
      priceCents: 35000,
      isActive: true,
      sortOrder: 2,
      shopId: shop.id
    },
    {
      id: "pkg_major",
      name: "Major Package",
      description: "Comprehensive service for performance bikes.",
      durationMinutes: 120,
      priceCents: 45000,
      isActive: true,
      sortOrder: 3,
      shopId: shop.id
    }
  ];

  for (const pkg of packages) {
    await prisma.servicePackage.upsert({
      where: { id: pkg.id },
      update: pkg,
      create: pkg
    });
  }

  await prisma.pricingRule.upsert({
    where: { id: "pricing_rule_default" },
    update: {
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
      afterHoursSurchargeBps: 1500,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      isActive: true,
      shopId: shop.id
    },
    create: {
      id: "pricing_rule_default",
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
      afterHoursSurchargeBps: 1500,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      isActive: true,
      shopId: shop.id
    }
  });

  console.log("Seeded shop:", shop.name);

  // ─── CycleDesk (second tenant) ────────────────────────────────────────────

  const cdShop = await prisma.shop.upsert({
    where: { slug: "cycledesk" },
    update: {
      name: "CycleDesk",
      phone: "+27110000010",
      email: "info@cycledesk.co.za",
      baseLocation: "Cape Town, South Africa",
      businessHours: "Mon–Sat 08:00–18:00",
      themeTokens: {
        shopStatus: "ACTIVE",
        primaryColor: "#6d28d9",
        shopName: "CycleDesk",
        bg: "#F6F7FB",
        surface: "#FFFFFF",
        text: "#0F172A",
        muted: "#475569",
        border: "#E2E8F0",
        accent: "#6d28d9",
        accentText: "#FFFFFF",
        radius: "12px"
      }
    },
    create: {
      slug: "cycledesk",
      name: "CycleDesk",
      phone: "+27110000010",
      email: "info@cycledesk.co.za",
      baseLocation: "Cape Town, South Africa",
      businessHours: "Mon–Sat 08:00–18:00",
      themeTokens: {
        shopStatus: "ACTIVE",
        primaryColor: "#6d28d9",
        shopName: "CycleDesk",
        bg: "#F6F7FB",
        surface: "#FFFFFF",
        text: "#0F172A",
        muted: "#475569",
        border: "#E2E8F0",
        accent: "#6d28d9",
        accentText: "#FFFFFF",
        radius: "12px"
      }
    }
  });

  const cdServices = [
    {
      id: "svc_cd_tuneup",
      name: "Basic Tune-Up",
      description: "Brake and gear adjustment, tyre pressure check, chain lube",
      durationMins: 45,
      basePriceCents: 35000,
      isActive: true,
      sortOrder: 1,
      shopId: cdShop.id
    },
    {
      id: "svc_cd_full",
      name: "Full Service",
      description: "Complete drivetrain clean, brake bleed, wheel true, full safety check",
      durationMins: 120,
      basePriceCents: 85000,
      isActive: true,
      sortOrder: 2,
      shopId: cdShop.id
    },
    {
      id: "svc_cd_puncture",
      name: "Puncture Repair",
      description: "Tube replacement or patch, tyre inspection",
      durationMins: 30,
      basePriceCents: 15000,
      isActive: true,
      sortOrder: 3,
      shopId: cdShop.id
    }
  ];

  for (const service of cdServices) {
    await prisma.serviceItem.upsert({
      where: { id: service.id },
      update: service,
      create: service
    });
  }

  await prisma.pricingRule.upsert({
    where: { id: "pricing_rule_cycledesk" },
    update: {
      calloutFeeCents: 10000,
      platformFeeCents: 2500,
      platformFeePercentBps: null,
      partsMarkupBps: 1500,
      travelBandRulesJson: [
        { minKm: 0, maxKm: 5, feeCents: 0, label: "0–5 km" },
        { minKm: 5, maxKm: 15, feeCents: 5000, label: "5–15 km" },
        { minKm: 15, maxKm: 30, feeCents: 10000, label: "15–30 km" }
      ],
      afterHoursEnabled: false,
      afterHoursSurchargeBps: 2500,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      isActive: true,
      shopId: cdShop.id
    },
    create: {
      id: "pricing_rule_cycledesk",
      calloutFeeCents: 10000,
      platformFeeCents: 2500,
      platformFeePercentBps: null,
      partsMarkupBps: 1500,
      travelBandRulesJson: [
        { minKm: 0, maxKm: 5, feeCents: 0, label: "0–5 km" },
        { minKm: 5, maxKm: 15, feeCents: 5000, label: "5–15 km" },
        { minKm: 15, maxKm: 30, feeCents: 10000, label: "15–30 km" }
      ],
      afterHoursEnabled: false,
      afterHoursSurchargeBps: 2500,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      isActive: true,
      shopId: cdShop.id
    }
  });

  console.log("Seeded shop:", cdShop.name);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
