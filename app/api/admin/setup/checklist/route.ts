import { requireAdmin } from "@/lib/admin/guard";
import { BookingsRepo, InvitesRepo, ProfilesRepo, ServiceItemsRepo, ShopRepo } from "@/src/lib/store";
import { ok, notFound } from "@/lib/api/responses";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const shop = await ShopRepo.getById(auth.shopId!);
  if (!shop) {
    return notFound("SHOP_NOT_FOUND", "Shop not found.");
  }

  const activeServices = await ServiceItemsRepo.listActive(auth.shopId!);
  const mechanics = await ProfilesRepo.listMechanics(auth.shopId!);
  const mechanicInvites = await InvitesRepo.list(auth.shopId!);
  const bookings = await BookingsRepo.list(auth.shopId!);

  const setup = [
    {
      key: "shop_details",
      title: "Shop details completed",
      href: "/admin/settings",
      complete: Boolean(
        shop.businessDetails?.name &&
          shop.businessDetails?.address &&
          shop.businessDetails?.city &&
          shop.businessDetails?.contactEmail &&
          shop.businessDetails?.contactPhone
      )
    },
    {
      key: "working_hours",
      title: "Working hours configured",
      href: "/admin/scheduling",
      complete: Boolean(shop.operationalDefaults?.workingHours?.some((entry) => entry.active))
    },
    {
      key: "services",
      title: "At least 5 services active",
      href: "/admin/catalog",
      complete: activeServices.length >= 5
    },
    {
      key: "mechanic",
      title: "At least 1 mechanic invited/active",
      href: "/admin/mechanics",
      complete: mechanics.some((mechanic) => mechanic.status === "ACTIVE") || mechanicInvites.length > 0
    },
    {
      key: "test_booking",
      title: "Test booking created",
      href: "/admin/bookings/new",
      complete: bookings.length > 0
    }
  ];

  return ok({
    setup,
    progressPercent: Math.round((setup.filter((item) => item.complete).length / setup.length) * 100)
  });
}
