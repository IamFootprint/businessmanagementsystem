import { z } from "zod";
import { requireRole } from "@/src/lib/auth/localSession";
import { badRequest, badRequestFromZod, created } from "@/lib/api/responses";
import { InvitesRepo } from "@/src/lib/store";
import { normalizeAndValidatePhone } from "@/src/lib/auth/localSession";

const schema = z.object({
  phone: z.string().min(6),
  name: z.string().trim().min(1).max(100)
});

export async function POST(req: Request) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success)
    return badRequestFromZod(
      "INVALID_INPUT",
      "Invalid customer details.",
      parsed.error,
      "Enter a valid phone and name."
    );

  const phone = normalizeAndValidatePhone(parsed.data.phone);
  if (!phone) return badRequest("INVALID_PHONE", "Invalid phone number format.");

  const invite = await InvitesRepo.create({
    phone,
    name: parsed.data.name.trim(),
    shopId: auth.profile.shopId!,
    role: "CLIENT"
  });

  const origin = req.headers.get("origin") || "";
  const inviteUrl = origin
    ? `${origin}/invites/accept?token=${invite.token}`
    : `/invites/accept?token=${invite.token}`;

  return created({ invite, inviteUrl });
}
