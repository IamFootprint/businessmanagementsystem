import { z } from "zod";
import { requirePlatformOwner } from "@/lib/admin/guard";
import { logAudit } from "@/lib/admin/audit";
import { ProfilesRepo, ShopRepo } from "@/src/lib/store";
import { ok, badRequest, notFound, serverError } from "@/lib/api/responses";

type RouteContext = { params: { id: string } };

const rejectSchema = z.object({
  reason: z.string().max(240).optional()
});

export async function POST(request: Request, context: RouteContext) {
  const auth = await requirePlatformOwner();
  if (!auth.ok) return auth.response!;

  const payload = await request.json().catch(() => ({}));
  const parsed = rejectSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_REJECTION_PAYLOAD", "Invalid rejection payload.");
  }

  const shop = await ShopRepo.getById(context.params.id);
  if (!shop) {
    return notFound("SHOP_NOT_FOUND", "Shop not found.");
  }
  const nowIso = new Date().toISOString();
  const updatedShop = await ShopRepo.update(shop.id, {
    shopStatus: "REJECTED",
    rejectedAtIso: nowIso,
    rejectionReason: parsed.data.reason?.trim() || undefined
  });
  if (!updatedShop) {
    return serverError("UNABLE_TO_REJECT_SHOP", "Unable to reject shop.");
  }

  if (updatedShop.createdByProfileId) {
    await ProfilesRepo.update(updatedShop.createdByProfileId, {
      status: "INACTIVE",
      onboardingStatus: "SHOP_PENDING_APPROVAL"
    });
  }

  await logAudit({
    actor: auth.phone,
    action: "platform.shop.rejected",
    entity: "shop",
    entityId: updatedShop.id,
    shopId: updatedShop.id,
    metadata: { reason: parsed.data.reason || null }
  });

  return ok({ shop: updatedShop });
}
