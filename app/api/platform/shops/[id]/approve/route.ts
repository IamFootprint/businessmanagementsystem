import { requirePlatformOwner } from "@/lib/admin/guard";
import { logAudit } from "@/lib/admin/audit";
import { ProfilesRepo, ShopRepo } from "@/src/lib/store";
import { ok, notFound, serverError } from "@/lib/api/responses";

type RouteContext = { params: { id: string } };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requirePlatformOwner();
  if (!auth.ok) return auth.response!;

  const shop = await ShopRepo.getById(context.params.id);
  if (!shop) {
    return notFound("SHOP_NOT_FOUND", "Shop not found.");
  }
  const nowIso = new Date().toISOString();
  const updatedShop = await ShopRepo.update(shop.id, {
    shopStatus: "ACTIVE",
    approvedAtIso: nowIso,
    rejectedAtIso: undefined,
    rejectionReason: undefined
  });
  if (!updatedShop) {
    return serverError("UNABLE_TO_APPROVE_SHOP", "Unable to approve shop.");
  }

  if (updatedShop.createdByProfileId) {
    await ProfilesRepo.update(updatedShop.createdByProfileId, {
      role: "SHOP_OWNER",
      shopId: updatedShop.id,
      status: "ACTIVE",
      onboardingStatus: "SHOP_ACTIVE"
    });
  }

  await logAudit({
    actor: auth.phone,
    action: "platform.shop.approved",
    entity: "shop",
    entityId: updatedShop.id,
    shopId: updatedShop.id,
    metadata: { shopStatus: updatedShop.shopStatus }
  });

  return ok({ shop: updatedShop });
}
