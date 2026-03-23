import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { ShopRepo } from "@/src/lib/store";
import { ok, notFound, badRequest, serverError } from "@/lib/api/responses";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const shop = await ShopRepo.getById(auth.shopId!);
  if (!shop) return notFound("SHOP_NOT_FOUND", "Shop not found.");

  const wc = shop.widgetConfig || {
    buttonColor: "#1a6b5a",
    buttonPosition: "bottom-right" as const,
    buttonLabel: "Book Now",
    hideFab: false,
    authorizedDomains: [],
    installedAt: null,
  };

  return ok({
    slug: shop.slug,
    name: shop.name,
    widgetConfig: {
      buttonColor: wc.buttonColor || "#1a6b5a",
      buttonPosition: wc.buttonPosition || "bottom-right",
      buttonLabel: wc.buttonLabel || "Book Now",
      hideFab: wc.hideFab || false,
      authorizedDomains: wc.authorizedDomains || [],
      installedAt: wc.installedAt || null,
    },
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const shop = await ShopRepo.getById(auth.shopId!);
  if (!shop) return notFound("SHOP_NOT_FOUND", "Shop not found.");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("INVALID_JSON", "Request body must be valid JSON.");
  }

  const existing = shop.widgetConfig || { authorizedDomains: [] };

  const buttonColor = typeof body.buttonColor === "string" ? body.buttonColor : existing.buttonColor;
  const buttonPosition =
    body.buttonPosition === "bottom-left" || body.buttonPosition === "bottom-right"
      ? body.buttonPosition
      : existing.buttonPosition;
  const buttonLabel = typeof body.buttonLabel === "string" ? body.buttonLabel : existing.buttonLabel;
  const authorizedDomains = Array.isArray(body.authorizedDomains)
    ? (body.authorizedDomains as string[]).filter((d) => typeof d === "string" && d.length > 0)
    : existing.authorizedDomains;

  try {
    await ShopRepo.update(auth.shopId!, {
      widgetConfig: {
        ...existing,
        buttonColor,
        buttonPosition,
        buttonLabel,
        authorizedDomains,
      },
    });
    return ok({ saved: true });
  } catch (err) {
    return serverError("SAVE_FAILED", "Failed to save widget settings.", undefined, err);
  }
}
