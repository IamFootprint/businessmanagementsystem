import { requireAdmin } from "@/lib/admin/guard";
import { normalizePhone } from "@/lib/auth/phone";
import { BikesRepo, ProfilesRepo } from "@/src/lib/store";
import { ok, badRequest, notFound } from "@/lib/api/responses";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const url = new URL(req.url);
  const rawPhone = url.searchParams.get("phone");
  const phone = normalizePhone(rawPhone || "");
  if (!phone || phone.length < 6) {
    return badRequest("PHONE_REQUIRED", "Phone is required.");
  }

  const client = await ProfilesRepo.getByPhone(phone);
  if (!client || client.shopId !== auth.shopId) {
    return notFound("CLIENT_NOT_FOUND", "Client not found.");
  }

  const bikes = await BikesRepo.listByCustomer(client.id);
  return ok({
    client: {
      id: client.id,
      name: client.name,
      phone: client.phone,
      status: client.status
    },
    bikes
  });
}
