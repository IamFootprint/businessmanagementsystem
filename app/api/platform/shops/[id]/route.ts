import { requirePlatformOwner } from "@/lib/admin/guard";
import { ProfilesRepo, ShopRepo } from "@/src/lib/store";
import { ok, notFound, badRequest } from "@/lib/api/responses";

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePlatformOwner();
  if (!auth.ok) return auth.response!;

  const shop = await ShopRepo.getById(context.params.id);
  if (!shop) {
    return notFound("SHOP_NOT_FOUND", "Shop not found.");
  }
  const owner = shop.createdByProfileId ? await ProfilesRepo.getById(shop.createdByProfileId) : null;
  return ok({
    shop,
    owner: owner
      ? {
          id: owner.id,
          name: owner.name,
          phone: owner.phone,
          status: owner.status,
          onboardingStatus: owner.onboardingStatus
        }
      : null
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePlatformOwner();
  if (!auth.ok) return auth.response!;

  const shop = await ShopRepo.getById(context.params.id);
  if (!shop) {
    return notFound("SHOP_NOT_FOUND", "Shop not found.");
  }

  const body = await request.json().catch(() => ({}));

  const updates: Record<string, unknown> = {};

  if (Array.isArray(body.customDomains)) {
    const domains = body.customDomains.filter((d: unknown) => typeof d === "string" && d.length > 0);
    updates.customDomains = domains;
  }

  if (Object.keys(updates).length === 0) {
    return badRequest("NO_UPDATES", "No valid fields to update.");
  }

  const updated = await ShopRepo.update(shop.id, updates);
  return ok({ shop: updated });
}
