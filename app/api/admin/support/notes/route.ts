import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { logAudit } from "@/lib/admin/audit";
import { ok, badRequest } from "@/lib/api/responses";

const schema = z.object({
  bookingId: z.string().min(1),
  note: z.string().min(2)
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_NOTE_PAYLOAD", "Invalid note payload.");
  }

  await logAudit({
    actor: auth.phone,
    action: "support.note",
    entity: "booking",
    entityId: parsed.data.bookingId,
    metadata: { note: parsed.data.note },
    shopId: auth.shopId!
  });

  return ok({ ok: true });
}
