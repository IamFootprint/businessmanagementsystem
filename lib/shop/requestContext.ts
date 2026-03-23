import { headers } from "next/headers";
import { ShopRepo, getDefaultShopId } from "@/src/lib/store";
import type { ShopRecord } from "@/src/lib/store";

/**
 * Read shop context from request headers set by middleware.
 * Falls back to the default shop for backward compatibility.
 */
export async function getRequestShopId(): Promise<string> {
  const h = headers();
  const hostname = h.get("x-shop-hostname");
  const slug = h.get("x-shop-slug");

  if (hostname) {
    const shop = await ShopRepo.getByDomain(hostname);
    if (shop) return shop.id;
  }

  if (slug) {
    const shop = await ShopRepo.getBySlug(slug);
    if (shop && shop.shopStatus === "ACTIVE") return shop.id;
  }

  return getDefaultShopId();
}

/**
 * Same as getRequestShopId but returns the full shop record.
 */
export async function getRequestShopContext(): Promise<ShopRecord | null> {
  const shopId = await getRequestShopId();
  return ShopRepo.getById(shopId);
}
