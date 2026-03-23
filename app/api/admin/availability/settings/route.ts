import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { logAudit } from "@/lib/admin/audit";
import { DEFAULT_AVAILABILITY_CONFIG } from "@/lib/availability/rules";
import { ok, badRequest, serverError } from "@/lib/api/responses";
import { ShopRepo } from "@/src/lib/store";

const availabilityConfigSchema = z.object({
  slotMinutes: z.number().int().min(15).max(120),
  setupBufferMinutes: z.number().int().min(0).max(60),
  wrapBufferMinutes: z.number().int().min(0).max(60),
  noticeHours: z.number().int().min(0).max(168)
});

const settingsSchema = z.object({
  businessHours: z.string().min(3),
  availabilityConfig: availabilityConfigSchema.optional()
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  try {
    const shop = await ShopRepo.getById(auth.shopId!);
    const tokens = shop?.themeTokens || {};
    const availabilityConfig = {
      ...DEFAULT_AVAILABILITY_CONFIG,
      ...(tokens.availabilityConfig as Record<string, unknown> || {})
    };
    return ok({
      businessHours: shop?.businessHours || "",
      availabilityConfig
    });
  } catch {
    return serverError("AVAILABILITY_SETTINGS_LOAD_FAILED", "Failed to load availability settings.");
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = settingsSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_AVAILABILITY_SETTINGS", "Invalid availability settings.");
  }

  try {
    const shop = await ShopRepo.getById(auth.shopId!);
    const existingTokens = shop?.themeTokens || {};
    const newTokens = parsed.data.availabilityConfig
      ? { ...existingTokens, availabilityConfig: parsed.data.availabilityConfig }
      : existingTokens;

    const updated = await ShopRepo.update(auth.shopId!, {
      businessHours: parsed.data.businessHours,
      themeTokens: newTokens
    });

    if (!updated) {
      return serverError("AVAILABILITY_SETTINGS_SAVE_FAILED", "Shop not found.");
    }

    await logAudit({
      actor: auth.phone,
      action: "availability.settings.update",
      entity: "shop_settings",
      entityId: updated.id,
      shopId: auth.shopId!
    });

    const tokens = updated.themeTokens || {};
    const availabilityConfig = {
      ...DEFAULT_AVAILABILITY_CONFIG,
      ...(tokens.availabilityConfig as Record<string, unknown> || {})
    };

    return ok({
      businessHours: updated.businessHours,
      availabilityConfig
    });
  } catch {
    return serverError("AVAILABILITY_SETTINGS_SAVE_FAILED", "Failed to save availability settings.");
  }
}
