import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformOwner } from "@/lib/admin/guard";
import { ProfilesRepo, ShopRepo } from "@/src/lib/store";
import { normalizePhone } from "@/lib/auth/phone";
import { logAudit } from "@/lib/admin/audit";
import { created, badRequest, serverError } from "@/lib/api/responses";

export async function GET() {
  const auth = await requirePlatformOwner();
  if (!auth.ok) return auth.response!;

  const shops = await ShopRepo.list();
  const rows = await Promise.all(
    shops.map(async (shop) => {
      const owner = shop.createdByProfileId ? await ProfilesRepo.getById(shop.createdByProfileId) : null;
      return {
        id: shop.id,
        slug: shop.slug,
        shopName: shop.businessDetails?.name || shop.name,
        city: shop.businessDetails?.city || "",
        submittedAt: shop.submittedAtIso || shop.createdAtIso,
        status: shop.shopStatus,
        createdByPhone: owner?.phone || "",
        createdByProfileId: shop.createdByProfileId || null
      };
    })
  );

  return NextResponse.json({ shops: rows });
}

/* ─── Create shop for partner ─────────────────────────────────────────────── */

const createShopSchema = z.object({
  shopName: z.string().min(2, "Shop name must be at least 2 characters"),
  ownerPhone: z.string().min(6, "Owner phone is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  city: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function uniqueSlug(base: string) {
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `${base}-${suffix}`;
}

export async function POST(request: Request) {
  const auth = await requirePlatformOwner();
  if (!auth.ok) return auth.response!;

  const payload = await request.json().catch(() => ({}));
  const parsed = createShopSchema.safeParse(payload);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message || "Invalid input.";
    return badRequest("INVALID_INPUT", firstError);
  }

  const data = parsed.data;
  const phone = normalizePhone(data.ownerPhone);

  const baseSlug = slugify(data.shopName) || "cycle-shop";
  const slug = uniqueSlug(baseSlug);

  let shop;
  try {
    shop = await ShopRepo.create({
      name: data.shopName.trim(),
      slug,
      phone: data.contactPhone?.trim() || phone,
      email: data.contactEmail?.trim() || undefined,
      baseLocation: data.address?.trim() || undefined,
      shopStatus: "ACTIVE",
      businessDetails: {
        name: data.shopName.trim(),
        city: data.city?.trim() || "",
        contactEmail: data.contactEmail?.trim() || "",
        contactPhone: data.contactPhone?.trim() || phone,
        address: data.address?.trim() || "",
      },
      submittedAtIso: new Date().toISOString(),
    });
  } catch (err) {
    return serverError("SHOP_CREATE_FAILED", "Unable to create shop.", undefined, err);
  }

  if (!shop) {
    return serverError("SHOP_CREATE_FAILED", "Unable to create shop.");
  }

  // Create or update the owner profile
  await ProfilesRepo.upsertByPhone({
    phone,
    name: data.ownerName.trim(),
    role: "SHOP_OWNER",
    status: "ACTIVE",
    shopId: shop.id,
    onboardingStatus: "SHOP_ACTIVE",
  });

  // Link the shop to the owner profile
  const ownerProfile = await ProfilesRepo.getByPhone(phone);
  if (ownerProfile) {
    await ShopRepo.update(shop.id, { createdByProfileId: ownerProfile.id });
  }

  await logAudit({
    actor: auth.phone,
    action: "platform.shop.created",
    entity: "shop",
    entityId: shop.id,
    shopId: shop.id,
    metadata: {
      shopName: shop.name,
      slug,
      ownerPhone: phone,
      ownerName: data.ownerName.trim(),
      city: data.city || null,
    },
  });

  return created({ shopId: shop.id, slug });
}
