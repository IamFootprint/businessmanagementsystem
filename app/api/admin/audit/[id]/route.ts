import { requireAdmin } from "@/lib/admin/guard";
import { getAuditEventDetail } from "@/lib/audit/query";
import { maskEmail, maskPhone, redactAuditValue } from "@/lib/audit/redaction";
import { ok, notFound } from "@/lib/api/responses";

function maskDisplay(value: string | null | undefined) {
  if (!value) return null;
  if (value.includes("@")) return maskEmail(value);
  if (/\+?[0-9][0-9\-\s]{6,}/.test(value)) return maskPhone(value);
  return value;
}

export async function GET(request: Request, context: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const event = await getAuditEventDetail(context.params.id, auth.shopId);
  if (!event) {
    return notFound("AUDIT_EVENT_NOT_FOUND", "Audit event not found.");
  }

  const searchParams = new URL(request.url).searchParams;
  const includeSensitive = searchParams.get("includeSensitive") === "1" && auth.role === "PLATFORM_OWNER";

  return ok({
    event: {
      ...event,
      actorDisplay: maskDisplay(event.actorDisplay),
      targetDisplay: maskDisplay(event.targetDisplay),
      reasonText: includeSensitive ? event.reasonText : maskDisplay(event.reasonText || undefined),
      beforeJson: includeSensitive ? event.beforeJson : redactAuditValue(event.beforeJson),
      afterJson: includeSensitive ? event.afterJson : redactAuditValue(event.afterJson),
      contextJson: includeSensitive ? event.contextJson : redactAuditValue(event.contextJson)
    }
  });
}
