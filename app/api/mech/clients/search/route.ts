import { requireRole } from "@/src/lib/auth/localSession";
import { normalizePhone } from "@/lib/auth/phone";
import { BikesRepo, ProfilesRepo } from "@/src/lib/store";
import { ok, badRequest, notFound } from "@/lib/api/responses";

export async function GET(req: Request) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  const url = new URL(req.url);
  const rawPhone = url.searchParams.get("phone");
  const phone = normalizePhone(rawPhone || "");
  if (!phone || phone.length < 6) {
    return badRequest("INVALID_INPUT", "Phone is required.");
  }

  const client = await ProfilesRepo.getByPhone(phone);
  if (!client || client.shopId !== auth.profile.shopId) {
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
