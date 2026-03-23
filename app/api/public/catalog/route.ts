import { NextResponse } from "next/server";
import { ServiceItemsRepo, ensureServiceSeed } from "@/src/lib/store";
import { getRequestShopId } from "@/lib/shop/requestContext";
import { listPublicPackages } from "@/lib/catalog/publicPackages";
import { getFakeCatalog, isFakeDbEnabled } from "@/lib/fake-db";

/**
 * Fallback: read catalog directly from fixtures when the store layer fails.
 * This ensures the public catalog endpoint never 500s on Vercel.
 */
async function fixturesFallback() {
  try {
    const catalog = await getFakeCatalog();
    const rawServices = Array.isArray(catalog?.services) ? catalog.services : [];
    const rawPackages = Array.isArray(catalog?.packages) ? catalog.packages : [];

    const services = rawServices
      .filter((s): s is Record<string, unknown> => s != null && typeof s === "object")
      .filter((s) => s.isActive !== false)
      .map((s) => ({
        id: String(s.id ?? ""),
        name: String(s.name ?? ""),
        description: s.description ? String(s.description) : undefined,
        durationMinutes: Number(s.durationMinutes ?? s.durationMins ?? 60),
        priceCents: Number(s.priceCents ?? s.basePriceCents ?? 0)
      }));

    const packages = rawPackages
      .filter((p): p is Record<string, unknown> => p != null && typeof p === "object")
      .filter((p) => p.isActive !== false)
      .map((p) => ({
        id: String(p.id ?? ""),
        name: String(p.name ?? ""),
        description: p.description ? String(p.description) : undefined,
        durationMinutes: Number(p.durationMinutes ?? 60),
        priceCents: Number(p.priceCents ?? 0)
      }));

    return { services, packages };
  } catch {
    return { services: [], packages: [] };
  }
}

export async function GET() {
  try {
    await ensureServiceSeed();
    const shopId = await getRequestShopId();
    const services = await ServiceItemsRepo.listActive(shopId);
    const packages = await listPublicPackages();
    const mapped = services.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      durationMinutes: item.durationMins,
      priceCents: item.basePriceCents
    }));

    const source = isFakeDbEnabled()
      ? "fixtures"
      : process.env.DATA_MODE === "prisma"
        ? "db"
        : "local-data";

    const response = NextResponse.json({ services: mapped, packages });
    response.headers.set("x-cycledesk-data-source", source);
    response.headers.set("x-data-source", source);
    return response;
  } catch (err) {
    console.error("[catalog] Primary path failed, trying fixtures fallback:", err);

    // Fallback to fixture data so the public catalog never returns 500
    try {
      const fallback = await fixturesFallback();
      if (fallback.services.length > 0 || fallback.packages.length > 0) {
        const response = NextResponse.json(fallback);
        response.headers.set("x-cycledesk-data-source", "fixtures-fallback");
        response.headers.set("x-data-source", "fixtures-fallback");
        return response;
      }
    } catch (fallbackErr) {
      console.error("[catalog] Fixtures fallback also failed:", fallbackErr);
    }

    return NextResponse.json(
      { error: "Failed to load catalog", services: [], packages: [] },
      { status: 500 }
    );
  }
}
