import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withShopContext } from "@/src/lib/db/shop-context";
import { requireAdmin } from "@/lib/admin/guard";
import { logAudit } from "@/lib/admin/audit";
import { ok, badRequest, notFound } from "@/lib/api/responses";

const themeTokensSchema = z.object({
  brandTagline: z.string().optional(),
  logoUrl: z.string().optional(),
  heroImageUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  headerBg: z.string().optional(),
  surfaceColor: z.string().optional(),
  textColor: z.string().optional(),
  ctaLabel: z.string().optional()
});

const shopSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  baseLocation: z.string().optional(),
  themeTokens: themeTokensSchema.optional()
});

function normalizeThemeTokens(input?: z.infer<typeof themeTokensSchema>) {
  return {
    brandTagline: input?.brandTagline || "",
    logoUrl: input?.logoUrl || "",
    heroImageUrl: input?.heroImageUrl || "",
    primaryColor: input?.primaryColor || "",
    accentColor: input?.accentColor || "",
    headerBg: input?.headerBg || "",
    surfaceColor: input?.surfaceColor || "",
    textColor: input?.textColor || "",
    ctaLabel: input?.ctaLabel || ""
  };
}

async function resolveShopId(candidateShopId?: string | null) {
  if (candidateShopId) {
    const existing = await prisma.shop.findUnique({ where: { id: candidateShopId }, select: { id: true } });
    if (existing?.id) return existing.id;
  }
  const fallback = await prisma.shop.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  return fallback?.id || null;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const resolvedShopId = await resolveShopId(auth.shopId);
  if (!resolvedShopId) {
    return notFound("SHOP_NOT_FOUND", "Shop settings missing.");
  }
  const shop = await withShopContext(resolvedShopId, (tx) =>
    tx.shop.findUnique({ where: { id: resolvedShopId } })
  );
  if (!shop) {
    return notFound("SHOP_NOT_FOUND", "Shop settings missing.");
  }
  return ok({
    shop: {
      ...shop,
      themeTokens: normalizeThemeTokens((shop.themeTokens as z.infer<typeof themeTokensSchema>) || undefined)
    }
  });
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = shopSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_SHOP_PAYLOAD", "Invalid shop payload.");
  }

  const resolvedShopId = await resolveShopId(auth.shopId);
  if (!resolvedShopId) {
    return notFound("SHOP_NOT_FOUND", "Shop settings missing.");
  }
  const updated = await withShopContext(resolvedShopId, (tx) =>
    tx.shop.update({
      where: { id: resolvedShopId },
      data: {
        ...parsed.data,
        themeTokens: normalizeThemeTokens(parsed.data.themeTokens)
      }
    })
  );

  await logAudit({
    actor: auth.phone,
    action: "settings.update",
    entity: "shop_settings",
    entityId: updated.id,
    shopId: resolvedShopId
  });

  return ok({ shop: updated });
}
