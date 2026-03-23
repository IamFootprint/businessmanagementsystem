import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { badRequest, badRequestFromZod, created, ok } from "@/lib/api/responses";
import { InvitesRepo } from "@/src/lib/store";
import { normalizeAndValidatePhone } from "@/src/lib/auth/localSession";
import { logAudit } from "@/lib/admin/audit";
import { logNotificationEvent } from "@/src/lib/workshop/notifications";

const schema = z.object({
  phone: z.string().min(6),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80)
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;
  const invites = await InvitesRepo.list(auth.shopId!);
  return ok({ invites });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_INVITE",
      "Some invite details are invalid.",
      parsed.error,
      "Enter a phone number and both names before saving."
    );
  }
  const normalized = normalizeAndValidatePhone(parsed.data.phone);
  if (!normalized) {
    return badRequest(
      "INVALID_PHONE",
      "The phone number format is invalid.",
      "Use the full phone number including country code if required."
    );
  }
  const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
  const invite = await InvitesRepo.create({ phone: normalized, name: fullName, shopId: auth.shopId! });
  const origin = req.headers.get("origin") || "";
  const inviteUrl = origin ? `${origin}/invites/accept?token=${invite.token}` : `/invites/accept?token=${invite.token}`;
  await logAudit({
    actor: auth.phone,
    action: "mechanic.invite.created",
    entity: "invite",
    entityId: invite.id,
    metadata: { phone: invite.phone, name: invite.name || null },
    shopId: auth.shopId!
  });
  await logNotificationEvent({
    eventType: "mechanic.invite.created",
    channel: "SYSTEM_STUB",
    message: `Mechanic invite created for ${invite.phone}.`,
    target: invite.phone,
    metadata: { inviteId: invite.id, inviteUrl }
  });
  return created({ invite, inviteUrl });
}
