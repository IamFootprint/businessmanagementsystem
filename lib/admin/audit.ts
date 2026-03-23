import { logAuditEvent, readFallbackAuditEvents } from "@/lib/audit/service";
import type { AuditEventCategory, AuditSeverity, PersistedAuditEvent } from "@/lib/audit/types";

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

export type AuditInput = {
  actor?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: unknown;
  shopId?: string;
  request?: Request;
  outcome?: "success" | "failure";
  severity?: AuditSeverity;
};

export type FallbackAuditLog = {
  id: string;
  actor?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: JsonValue | null;
  createdAt: string;
};

function normalizeAuditMetadata(value: unknown): JsonValue | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const valueType = typeof value;
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return value as string | number | boolean;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeAuditMetadata(item)) as JsonValue[];
  }
  if (valueType === "object") {
    const output: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (typeof item === "undefined") continue;
      output[key] = normalizeAuditMetadata(item);
    }
    return output;
  }
  return String(value);
}

function inferCategory(action: string): AuditEventCategory {
  const root = action.split(".")[0]?.toLowerCase();
  switch (root) {
    case "auth":
    case "booking":
    case "pricing":
    case "availability":
    case "job_card":
    case "invoice":
    case "support":
    case "admin":
    case "security":
    case "system":
    case "platform":
    case "profile":
    case "catalog":
    case "inventory":
    case "notification":
    case "payment":
    case "export":
      return root;
    default:
      return "legacy";
  }
}

function mapFallbackEvent(event: PersistedAuditEvent): FallbackAuditLog {
  return {
    id: event.id,
    actor: event.actorDisplay || null,
    action: event.eventName,
    entity: event.targetType || "unknown",
    entityId: event.targetId || null,
    metadata: (event.contextJson as JsonValue | null) || null,
    createdAt: event.occurredAt
  };
}

export async function readFallbackAuditLogs(limit = 200): Promise<FallbackAuditLog[]> {
  const rows = await readFallbackAuditEvents(limit);
  return rows.map(mapFallbackEvent);
}

export async function logAudit(input: AuditInput) {
  const metadata = normalizeAuditMetadata(input.metadata);
  const metadataObject = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : null;

  return logAuditEvent({
    eventName: input.action,
    eventCategory: inferCategory(input.action),
    severity: input.severity || "info",
    outcome: input.outcome || "success",
    action: input.action,
    actor: {
      type: input.actor ? "user" : "system",
      display: input.actor || null
    },
    target: {
      type: input.entity,
      id: input.entityId || null,
      display: input.entityId || null
    },
    reasonText:
      typeof metadataObject?.reason === "string"
        ? (metadataObject.reason as string)
        : null,
    contextJson: metadata,
    shopId: input.shopId || null
  }, input.request);
}
