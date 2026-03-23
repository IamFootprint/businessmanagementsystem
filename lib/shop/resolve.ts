import { ShopRepo, getDefaultShopId } from "@/src/lib/store";
import type { ShopRecord } from "@/src/lib/store";

const PLATFORM_DOMAINS = [
  "cycledesk.co.za",
  "www.cycledesk.co.za",
  "localhost",
  "127.0.0.1",
];

const PLATFORM_DOMAIN_SUFFIXES = [
  ".cycledesk.co.za",
  ".vercel.app",
  ".localhost",
];

export function isPlatformDomain(hostname: string): boolean {
  const bare = hostname.split(":")[0].toLowerCase();
  if (PLATFORM_DOMAINS.includes(bare)) return true;
  return PLATFORM_DOMAIN_SUFFIXES.some((suffix) => bare.endsWith(suffix));
}

// Known booking-flow path segments that should NOT be treated as shop slugs
const BOOKING_STEPS = new Set([
  "start", "details", "slot", "review", "success", "components",
]);

/**
 * Resolve a shop from the incoming request context.
 *
 * Resolution order:
 *  1. Custom domain match (e.g. book.servicemybikejoburg.co.za)
 *  2. Subdomain of platform (e.g. servicemybike.cycledesk.co.za)
 *  3. Slug in /book/{slug}/... path
 *  4. Fallback to default shop (backward compat)
 */
export async function resolveShopFromRequest(
  hostname: string,
  pathname: string
): Promise<{ shop: ShopRecord | null; shopId: string; source: "domain" | "subdomain" | "path" | "default" }> {
  const bare = hostname.split(":")[0].toLowerCase();

  // 1. Custom domain
  if (!isPlatformDomain(bare)) {
    const shop = await ShopRepo.getByDomain(bare);
    if (shop) return { shop, shopId: shop.id, source: "domain" };
  }

  // 2. Subdomain (e.g. servicemybike.cycledesk.co.za)
  const subdomainMatch = bare.match(/^([a-z0-9-]+)\.cycledesk\.co\.za$/);
  if (subdomainMatch && subdomainMatch[1] !== "www" && subdomainMatch[1] !== "book") {
    const shop = await ShopRepo.getBySlug(subdomainMatch[1]);
    if (shop && shop.shopStatus === "ACTIVE") {
      return { shop, shopId: shop.id, source: "subdomain" };
    }
  }

  // 3. Slug in path: /book/{slug}/start → slug is first segment after /book/
  const bookPathMatch = pathname.match(/^\/book\/([a-z0-9-]+)(\/|$)/);
  if (bookPathMatch && !BOOKING_STEPS.has(bookPathMatch[1])) {
    const shop = await ShopRepo.getBySlug(bookPathMatch[1]);
    if (shop && shop.shopStatus === "ACTIVE") {
      return { shop, shopId: shop.id, source: "path" };
    }
  }

  // 4. Fallback
  const shopId = await getDefaultShopId();
  const shop = await ShopRepo.getById(shopId);
  return { shop, shopId, source: "default" };
}
