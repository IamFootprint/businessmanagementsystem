import { getPublicPackageById } from "@/lib/catalog/publicPackages";
import { ensureServiceSeed, ServiceItemsRepo } from "@/src/lib/store";

export type BookingItemType = "service" | "package";

export type BookingTarget = {
  kind: BookingItemType;
  name: string;
  durationMinutes: number;
  basePriceCents: number;
  serviceItemId?: string;
  selectedPackageId?: string;
};

export async function resolveBookingTarget(
  itemId: string,
  itemType: BookingItemType
): Promise<BookingTarget | null> {
  if (itemType === "package") {
    const pkg = await getPublicPackageById(itemId);
    if (!pkg) return null;
    return {
      kind: "package",
      name: pkg.name,
      durationMinutes: pkg.durationMinutes,
      basePriceCents: pkg.priceCents,
      selectedPackageId: pkg.id
    };
  }

  await ensureServiceSeed();
  const service = await ServiceItemsRepo.get(itemId);
  if (!service || !service.isActive) return null;
  return {
    kind: "service",
    name: service.name,
    durationMinutes: service.durationMins,
    basePriceCents: service.basePriceCents,
    serviceItemId: service.id
  };
}
