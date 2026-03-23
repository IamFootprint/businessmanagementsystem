import { z } from "zod";
import { ShopRepo, getDefaultShopId } from "@/src/lib/store";
import { ok, badRequest, notFound, serverError } from "@/lib/api/responses";

const QuerySchema = z.object({
  host: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      host: url.searchParams.get("host") ?? undefined,
      slug: url.searchParams.get("slug") ?? undefined,
    });

    if (!parsed.success) {
      return badRequest("INVALID_QUERY", "Invalid query parameters.");
    }

    const { host, slug } = parsed.data;

    // Resolve by custom domain
    if (host) {
      const shop = await ShopRepo.getByDomain(host);
      if (shop) return ok({ shop, resolvedBy: "domain" });
    }

    // Resolve by slug
    if (slug) {
      const shop = await ShopRepo.getBySlug(slug);
      if (shop && shop.shopStatus === "ACTIVE") {
        return ok({ shop, resolvedBy: "slug" });
      }
      return notFound("SHOP_NOT_FOUND", "No active shop found for this slug.");
    }

    // Fallback to default shop
    const defaultId = await getDefaultShopId();
    const shop = await ShopRepo.getById(defaultId);
    if (!shop) {
      return notFound("SHOP_NOT_CONFIGURED", "Shop not configured.");
    }
    return ok({ shop, resolvedBy: "default" });
  } catch {
    return serverError("RESOLVE_SHOP_FAILED", "Failed to resolve shop.");
  }
}
