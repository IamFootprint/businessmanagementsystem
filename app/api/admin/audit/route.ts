import { requireAdmin } from "@/lib/admin/guard";
import { ok, badRequest } from "@/lib/api/responses";
import { listAuditEvents, parseAuditFilters } from "@/lib/audit/query";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const url = new URL(request.url);
  const filters = parseAuditFilters(url.searchParams);

  if (filters.take < 1) {
    return badRequest("INVALID_TAKE", "take must be at least 1.");
  }

  const result = await listAuditEvents(filters, auth.shopId);

  const logs = result.items.map((item) => ({
    id: item.id,
    actorDisplay: item.actorDisplay,
    actor: item.actorDisplay,
    action: item.eventName,
    actionLabel: item.eventName,
    entity: item.targetType || "record",
    entityId: item.targetId,
    targetDisplay: item.targetDisplay,
    summary: [],
    createdAt: item.occurredAt
  }));

  return ok({
    items: result.items,
    total: result.total,
    source: result.source,
    logs,
    filters
  });
}
