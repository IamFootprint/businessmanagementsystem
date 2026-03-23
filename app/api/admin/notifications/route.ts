import { requireAdmin } from "@/lib/admin/guard";
import { ok } from "@/lib/api/responses";
import { listNotificationEvents } from "@/src/lib/workshop/notifications";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const events = await listNotificationEvents(300);
  return ok({ events });
}
