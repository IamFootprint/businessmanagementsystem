import { requireAdmin } from "@/lib/admin/guard";
import { asCsv, exportAuditEvents, parseAuditFilters } from "@/lib/audit/query";
import { logAuditEvent } from "@/lib/audit/service";
import { maskEmail, maskPhone, redactAuditValue } from "@/lib/audit/redaction";
import { badRequest, forbidden } from "@/lib/api/responses";

function maskDisplay(value: string | null | undefined) {
  if (!value) return null;
  if (value.includes("@")) return maskEmail(value);
  if (/\+?[0-9][0-9\-\s]{6,}/.test(value)) return maskPhone(value);
  return value;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") || "csv").toLowerCase();
  if (format !== "csv" && format !== "json") {
    return badRequest("INVALID_EXPORT_FORMAT", "format must be csv or json.");
  }

  const includeSensitive = url.searchParams.get("includeSensitive") === "1";
  if (includeSensitive && auth.role !== "PLATFORM_OWNER") {
    return forbidden("FORBIDDEN", "Only platform owners may request unmasked export payloads.");
  }

  const filters = parseAuditFilters(url.searchParams);
  const result = await exportAuditEvents(filters, auth.shopId);

  await logAuditEvent({
    eventName: "audit.export.generated",
    eventCategory: "export",
    action: "generate",
    actor: {
      type: "user",
      id: auth.profileId || null,
      display: auth.phone || null,
      role: auth.role || null
    },
    target: {
      type: "audit_export",
      id: `${format}:${Date.now()}`,
      display: "Admin audit export"
    },
    contextJson: {
      format,
      count: result.rows.length,
      source: result.source,
      filters
    },
    shopId: auth.shopId || null,
    isSensitive: true,
    retentionClass: "security"
  }, request);

  const fileDate = new Date().toISOString().replace(/[:.]/g, "-");

  if (format === "csv") {
    const csv = asCsv(result.rows);
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename=audits-${fileDate}.csv`
      }
    });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    source: result.source,
    count: result.rows.length,
    rows: result.rows.map((row) => ({
      ...row,
      actorDisplay: includeSensitive ? row.actorDisplay : maskDisplay(row.actorDisplay),
      targetDisplay: includeSensitive ? row.targetDisplay : maskDisplay(row.targetDisplay),
      reasonText: includeSensitive ? row.reasonText : maskDisplay(row.reasonText || undefined),
      beforeJson: includeSensitive ? row.beforeJson : redactAuditValue(row.beforeJson),
      afterJson: includeSensitive ? row.afterJson : redactAuditValue(row.afterJson),
      contextJson: includeSensitive ? row.contextJson : redactAuditValue(row.contextJson)
    }))
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename=audits-${fileDate}.json`
    }
  });
}
