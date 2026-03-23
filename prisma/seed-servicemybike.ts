/**
 * Seed script for ServiceMyBike Joburg (Tebogo Mokwatlo) production data.
 *
 * Idempotent — safe to re-run. Uses upserts keyed on unique fields.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx apps/web/prisma/seed-servicemybike.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ─── 1. Upsert Shop ───────────────────────────────────────────────────────

  const shop = await prisma.shop.upsert({
    where: { slug: "servicemybike" },
    update: {
      name: "ServiceMyBike Joburg",
      phone: "+27660994766",
      whatsapp: "+27660994766",
      email: "info@servicemybikejoburg.co.za",
      baseLocation: "Fourways, Johannesburg",
    },
    create: {
      slug: "servicemybike",
      name: "ServiceMyBike Joburg",
      phone: "+27660994766",
      whatsapp: "+27660994766",
      email: "info@servicemybikejoburg.co.za",
      baseLocation: "Fourways, Johannesburg",
    },
  });

  console.log("Upserted shop:", shop.name, `(id: ${shop.id})`);

  // ─── 2. Upsert Tebogo's Profile ───────────────────────────────────────────

  const profile = await prisma.profile.upsert({
    where: { phone: "+27660994766" },
    update: {
      name: "Tebogo Mokwatlo",
      role: "ADMIN",
      status: "ACTIVE",
      shopId: shop.id,
    },
    create: {
      phone: "+27660994766",
      name: "Tebogo Mokwatlo",
      role: "ADMIN",
      status: "ACTIVE",
      shopId: shop.id,
    },
  });

  console.log("Upserted profile:", profile.name, `(id: ${profile.id}, role: ${profile.role})`);

  // ─── 3. Create Service Items ───────────────────────────────────────────────

  const serviceItems = [
    {
      id: "svc_smb_minor",
      name: "Minor Service / Basic Tune-Up",
      description: "Basic safety check, brake & gear adjustment, chain lube.",
      basePriceCents: 35000,
      durationMins: 60,
      sortOrder: 1,
    },
    {
      id: "svc_smb_major_mtb_road",
      name: "Major Service (MTB & Road)",
      description: "Full tune, drivetrain clean, brake bleed, wheel true, safety inspection.",
      basePriceCents: 65000,
      durationMins: 120,
      sortOrder: 2,
    },
    {
      id: "svc_smb_major_dual_sus",
      name: "Major Service (Dual Suspension)",
      description: "Full service including front and rear suspension service for dual-suspension bikes.",
      basePriceCents: 85000,
      durationMins: 150,
      sortOrder: 3,
    },
    {
      id: "svc_smb_suspension",
      name: "Suspension Service",
      description: "Fork and/or rear shock service, seal replacement, oil change.",
      basePriceCents: 55000,
      durationMins: 90,
      sortOrder: 4,
    },
    {
      id: "svc_smb_callout",
      name: "Callout Fee",
      description: "Mobile mechanic callout fee.",
      basePriceCents: 15000,
      durationMins: 0,
      sortOrder: 5,
    },
  ];

  for (const item of serviceItems) {
    const svc = await prisma.serviceItem.upsert({
      where: { id: item.id },
      update: {
        ...item,
        isActive: true,
        shopId: shop.id,
      },
      create: {
        ...item,
        isActive: true,
        shopId: shop.id,
      },
    });
    console.log("  Upserted service:", svc.name, `R${(svc.basePriceCents / 100).toFixed(0)}`);
  }

  console.log("\nDone. ServiceMyBike Joburg seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
