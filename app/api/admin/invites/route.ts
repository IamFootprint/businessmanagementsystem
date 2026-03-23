import { z } from "zod";
import { InvitesRepo } from "@/src/lib/store";
import { normalizeAndValidatePhone, requireRole } from "@/src/lib/auth/localSession";
import { ok, badRequest } from "@/lib/api/responses";

const schema = z.object({
  phone: z.string().min(6),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80)
});

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response!;
  const invites = await InvitesRepo.list(auth.profile.shopId);
  return ok({ invites });
}

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response!;
  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_INPUT", "Invalid invite.");
  }
  const normalized = normalizeAndValidatePhone(parsed.data.phone);
  if (!normalized) {
    return badRequest("INVALID_PHONE", "Invalid phone number.");
  }
  const invite = await InvitesRepo.create({
    phone: normalized,
    name: `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
    shopId: auth.profile.shopId
  });
  const origin = req.headers.get("origin") || "";
  const inviteUrl = origin ? `${origin}/invites/accept?token=${invite.token}` : `/invites/accept?token=${invite.token}`;
  return ok({ invite, inviteUrl });
}
