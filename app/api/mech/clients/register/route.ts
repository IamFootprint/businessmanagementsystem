import { z } from "zod";
import { requireRole } from "@/src/lib/auth/localSession";
import { ok, badRequest, badRequestFromZod } from "@/lib/api/responses";
import { ProfilesRepo } from "@/src/lib/store";
import { normalizePhone, isAllowedPhone } from "@/lib/auth/phone";

const schema = z.object({
  phone: z.string().min(6),
  name: z.string().trim().min(1).max(100)
});

export async function POST(req: Request) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return badRequestFromZod("INVALID_INPUT", "Invalid customer details.", parsed.error, "Enter a valid phone and name.");

  const phone = normalizePhone(parsed.data.phone);
  if (!isAllowedPhone(phone)) return badRequest("INVALID_PHONE", "Invalid phone number.");

  const existing = await ProfilesRepo.getByPhone(phone);
  if (existing) {
    return ok({ client: { id: existing.id, name: existing.name, phone: existing.phone, status: existing.status }, alreadyExists: true });
  }

  const profile = await ProfilesRepo.upsertByPhone({
    phone,
    name: parsed.data.name.trim(),
    role: "CLIENT",
    status: "ACTIVE",
    shopId: auth.profile.shopId,
    onboardingStatus: "CLIENT_PROFILE_INCOMPLETE"
  });

  return ok({
    client: { id: profile.id, name: profile.name, phone: profile.phone, status: profile.status },
    alreadyExists: false
  });
}
