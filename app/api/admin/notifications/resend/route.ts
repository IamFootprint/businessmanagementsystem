import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { badRequestFromZod, notFound, ok } from "@/lib/api/responses";
import { requeueNotificationEvent } from "@/src/lib/workshop/notifications";

const schema = z.object({
  id: z.string().min(1)
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod("INVALID_RESEND_REQUEST", "The resend request is invalid.", parsed.error);
  }

  const event = await requeueNotificationEvent(parsed.data.id);
  if (!event) {
    return notFound("NOTIFICATION_NOT_FOUND", "We could not find that notification event.");
  }

  return ok({ event });
}
