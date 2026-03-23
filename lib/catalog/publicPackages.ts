import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { getFakeCatalog, isFakeDbEnabled } from "@/lib/fake-db";
import { getDefaultShopId } from "@/src/lib/store";

export type PublicPackage = {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
};

const packageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(1),
  priceCents: z.number().int().min(0),
  isActive: z.boolean().optional()
});

function mapFakePackage(raw: unknown): PublicPackage | null {
  const parsed = packageSchema.safeParse(raw);
  if (!parsed.success) return null;
  if (parsed.data.isActive === false) return null;
  return {
    id: parsed.data.id,
    name: parsed.data.name,
    description: parsed.data.description,
    durationMinutes: parsed.data.durationMinutes,
    priceCents: parsed.data.priceCents
  };
}

async function readFixturePackages(): Promise<PublicPackage[]> {
  try {
    const fixturePath = path.join(process.cwd(), "fixtures", "catalog.json");
    const raw = await fs.readFile(fixturePath, "utf8");
    const parsed = JSON.parse(raw) as { packages?: unknown[] };
    const candidates = Array.isArray(parsed.packages) ? parsed.packages : [];
    return candidates
      .map((item) => mapFakePackage(item))
      .filter((item): item is PublicPackage => Boolean(item));
  } catch {
    return [];
  }
}

export async function listPublicPackages(): Promise<PublicPackage[]> {
  if (isFakeDbEnabled()) {
    const catalog = await getFakeCatalog();
    const rawPackages = Array.isArray(catalog?.packages) ? catalog.packages : [];
    return rawPackages
      .map((item) => mapFakePackage(item))
      .filter((item): item is PublicPackage => Boolean(item));
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const shopId = await getDefaultShopId();
    const rows = await prisma.servicePackage.findMany({
      where: { shopId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
    return rows.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description ?? undefined,
      durationMinutes: pkg.durationMinutes,
      priceCents: pkg.priceCents
    }));
  } catch {
    return readFixturePackages();
  }
}

export async function getPublicPackageById(id: string): Promise<PublicPackage | null> {
  if (!id) return null;

  if (isFakeDbEnabled()) {
    const packages = await listPublicPackages();
    return packages.find((item) => item.id === id) || null;
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const pkg = await prisma.servicePackage.findUnique({ where: { id } });
    if (!pkg || !pkg.isActive) return null;
    return {
      id: pkg.id,
      name: pkg.name,
      description: pkg.description ?? undefined,
      durationMinutes: pkg.durationMinutes,
      priceCents: pkg.priceCents
    };
  } catch {
    const fallback = await readFixturePackages();
    return fallback.find((item) => item.id === id) || null;
  }
}
