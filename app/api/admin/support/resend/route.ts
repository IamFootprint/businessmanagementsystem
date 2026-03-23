import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { logAudit } from "@/lib/admin/audit";
import { ok, badRequest } from "@/lib/api/responses";

const schema = z.object({
  bookingId: z.string().min(1),
  channel: z.enum(["whatsapp", "email"])
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_RESEND_PAYLOAD", "Invalid resend payload.");
  }

  await logAudit({
    actor: auth.phone,
    action: "support.resend",
    entity: "booking",
    entityId: parsed.data.bookingId,
    metadata: { channel: parsed.data.channel },
    shopId: auth.shopId!
  });

  return ok({ ok: true });
}
