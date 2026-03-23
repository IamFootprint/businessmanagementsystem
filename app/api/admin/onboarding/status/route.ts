import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import {
  ShopRepo,
  ServiceItemsRepo,
  ProfilesRepo,
  BookingsRepo,
} from "@/src/lib/store";

const DEFAULT_HOURS = [
  { day: "Mon", start: "08:00", end: "18:00", active: true },
  { day: "Tue", start: "08:00", end: "18:00", active: true },
  { day: "Wed", start: "08:00", end: "18:00", active: true },
  { day: "Thu", start: "08:00", end: "18:00", active: true },
  { day: "Fri", start: "08:00", end: "18:00", active: true },
  { day: "Sat", start: "08:00", end: "18:00", active: true },
  { day: "Sun", start: "08:00", end: "18:00", active: false },
];

function hoursMatchDefault(
  hours: Array<{ day: string; start: string; end: string; active: boolean }> | undefined
): boolean {
  if (!hours || hours.length === 0) return true;
  return hours.every((h, i) => {
    const d = DEFAULT_HOURS[i];
    if (!d) return false;
    return h.day === d.day && h.start === d.start && h.end === d.end && h.active === d.active;
  });
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response!;

    const shopId = auth.shopId;
    if (!shopId) {
      return NextResponse.json(
        { error: "No shop associated with this account" },
        { status: 400 }
      );
    }

    const shop = await ShopRepo.getById(shopId);
    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      );
    }

    const [services, mechanics, bookings] = await Promise.all([
      ServiceItemsRepo.list(shopId),
      ProfilesRepo.listMechanics(shopId),
      BookingsRepo.list(shopId),
    ]);

    const completedItems = shop.onboardingChecklist?.completedItems || [];
    const hasCustomHours = !hoursMatchDefault(shop.operationalDefaults?.workingHours);
    const hasLogo = Boolean(
      shop.themeTokens && (shop.themeTokens.logo || shop.themeTokens.logoUrl)
    );
    const hasMechanic = mechanics.some((m) => m.status === "ACTIVE");
    const hasBooking = bookings.length > 0;
    const hasCatalogEdits = services.length > 0;
    const widgetInstalled = Boolean(shop.widgetConfig?.installedAt);

    return NextResponse.json({
      completedItems,
      shopSlug: shop.slug,
      hasCatalogEdits,
      hasCustomHours,
      hasLogo,
      hasMechanic,
      hasBooking,
      widgetInstalled,
    });
  } catch (err) {
    console.error("[onboarding/status] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
