import { prisma } from "@/lib/prisma";
import { maskEmail, maskPhone } from "@/lib/audit/redaction";
import { readFallbackAuditEvents } from "@/lib/audit/service";
import type { PersistedAuditEvent } from "@/lib/audit/types";

type AuditEventRecord = PersistedAuditEvent;

export type AuditFilters = {
  from?: string;
  to?: string;
  actor?: string;
  eventCategory?: string;
  eventName?: string;
  targetType?: string;
  outcome?: string;
  channel?: string;
  query?: string;
  take: number;
};

export type AuditListItem = {
  id: string;
  occurredAt: string;
  eventName: string;
  eventCategory: string;
  outcome: string;
  severity: string;
  actorDisplay: string;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  targetDisplay: string;
  action: string;
  channel: string | null;
  requestId: string | null;
  isSensitive: boolean;
};

const DEFAULT_TAKE = 200;
const MAX_TAKE = 1000;

function shouldUsePrismaStore() {
  return process.env.DATA_MODE === "prisma";
}

function parseDateBound(value: string | null, endOfDay = false) {
  if (!value) return null;
  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const parsed = new Date(value.includes("T") ? value : `${value}${suffix}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function parseAuditFilters(searchParams: URLSearchParams): AuditFilters {
  const takeRaw = Number(searchParams.get("take") || DEFAULT_TAKE);
  const take = Number.isFinite(takeRaw)
    ? Math.max(1, Math.min(MAX_TAKE, Math.trunc(takeRaw)))
    : DEFAULT_TAKE;

  return {
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    actor: searchParams.get("actor") || undefined,
    eventCategory: searchParams.get("eventCategory") || undefined,
    eventName: searchParams.get("eventName") || undefined,
    targetType: searchParams.get("targetType") || undefined,
    outcome: searchParams.get("outcome") || undefined,
    channel: searchParams.get("channel") || undefined,
    query: searchParams.get("q") || undefined,
    take
  };
}

function maskDisplayValue(value: string | null | undefined): string {
  if (!value) return "System";
  if (value.includes("@")) return maskEmail(value) || "***";
  if (/\+?[0-9][0-9\-\s]{6,}/.test(value)) return maskPhone(value) || "***";
  return value;
}

function normalizeRecordFromPrisma(row: {
  id: string;
  occurredAt: Date;
  recordedAt: Date;
  eventName: string;
  eventCategory: string;
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  outcome: "SUCCESS" | "FAILURE";
  actorType: "USER" | "SYSTEM" | "API_KEY" | "WEBHOOK";
  actorId: string | null;
  actorDisplay: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  targetDisplay: string | null;
  action: string;
  subaction: string | null;
  reasonCode: string | null;
  reasonText: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  changedFields: string[];
  contextJson: unknown;
  requestId: string | null;
  traceId: string | null;
  spanId: string | null;
  sessionId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceId: string | null;
  channel: string | null;
  route: string | null;
  httpMethod: string | null;
  tenantId: string | null;
  environment: string;
  serviceName: string;
  serviceVersion: string | null;
  isSensitive: boolean;
  retentionClass: string;
  shopId: string | null;
}): AuditEventRecord {
  return {
    id: row.id,
    occurredAt: row.occurredAt.toISOString(),
    recordedAt: row.recordedAt.toISOString(),
    eventName: row.eventName,
    eventCategory: row.eventCategory,
    severity: row.severity.toLowerCase() as AuditEventRecord["severity"],
    outcome: row.outcome.toLowerCase() as AuditEventRecord["outcome"],
    actorType: row.actorType.toLowerCase() as AuditEventRecord["actorType"],
    actorId: row.actorId,
    actorDisplay: row.actorDisplay,
    actorRole: row.actorRole,
    targetType: row.targetType,
    targetId: row.targetId,
    targetDisplay: row.targetDisplay,
    action: row.action,
    subaction: row.subaction,
    reasonCode: row.reasonCode,
    reasonText: row.reasonText,
    beforeJson: row.beforeJson,
    afterJson: row.afterJson,
    changedFields: row.changedFields || [],
    contextJson: row.contextJson,
    requestId: row.requestId,
    traceId: row.traceId,
    spanId: row.spanId,
    sessionId: row.sessionId,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    deviceId: row.deviceId,
    channel: row.channel,
    route: row.route,
    httpMethod: row.httpMethod,
    tenantId: row.tenantId,
    environment: row.environment,
    serviceName: row.serviceName,
    serviceVersion: row.serviceVersion,
    isSensitive: row.isSensitive,
    retentionClass: row.retentionClass as AuditEventRecord["retentionClass"],
    shopId: row.shopId
  };
}

function matchesFilter(event: AuditEventRecord, filters: AuditFilters) {
  if (filters.from) {
    const from = parseDateBound(filters.from, false);
    if (from && new Date(event.occurredAt) < from) return false;
  }
  if (filters.to) {
    const to = parseDateBound(filters.to, true);
    if (to && new Date(event.occurredAt) > to) return false;
  }
  if (filters.actor) {
    const actorNeedle = filters.actor.toLowerCase();
    const actorHaystack = `${event.actorDisplay || ""} ${event.actorId || ""}`.toLowerCase();
    if (!actorHaystack.includes(actorNeedle)) return false;
  }
  if (filters.eventCategory && event.eventCategory !== filters.eventCategory) return false;
  if (filters.eventName && event.eventName !== filters.eventName) return false;
  if (filters.targetType && event.targetType !== filters.targetType) return false;
  if (filters.outcome && event.outcome !== filters.outcome) return false;
  if (filters.channel && event.channel !== filters.channel) return false;
  if (filters.query) {
    const query = filters.query.toLowerCase();
    const haystack = [
      event.targetId,
      event.targetDisplay,
      event.requestId,
      event.eventName,
      event.action
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function toListItem(event: AuditEventRecord): AuditListItem {
  return {
    id: event.id,
    occurredAt: event.occurredAt,
    eventName: event.eventName,
    eventCategory: event.eventCategory,
    outcome: event.outcome,
    severity: event.severity,
    actorDisplay: maskDisplayValue(event.actorDisplay || event.actorId || undefined),
    actorRole: event.actorRole || null,
    targetType: event.targetType || null,
    targetId: event.targetId || null,
    targetDisplay: maskDisplayValue(event.targetDisplay || event.targetId || undefined),
    action: event.action,
    channel: event.channel || null,
    requestId: event.requestId || null,
    isSensitive: Boolean(event.isSensitive)
  };
}

export async function listAuditEvents(filters: AuditFilters, shopId?: string | null) {
  if (!shouldUsePrismaStore()) {
    const localRows = await readFallbackAuditEvents(5000);
    const filtered = localRows
      .filter((event) => (shopId ? event.shopId === shopId : true))
      .filter((event) => matchesFilter(event, filters))
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
      .slice(0, filters.take);

    return {
      source: "local-fallback",
      items: filtered.map(toListItem),
      total: filtered.length
    };
  }

  try {
    const where: Record<string, unknown> = {};
    if (shopId) where.shopId = shopId;
    const from = parseDateBound(filters.from || null, false);
    const to = parseDateBound(filters.to || null, true);
    if (from || to) {
      where.occurredAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {})
      };
    }
    if (filters.eventCategory) where.eventCategory = filters.eventCategory;
    if (filters.eventName) where.eventName = filters.eventName;
    if (filters.targetType) where.targetType = filters.targetType;
    if (filters.channel) where.channel = filters.channel;
    if (filters.outcome) where.outcome = filters.outcome.toUpperCase();

    const and: Record<string, unknown>[] = [];
    if (filters.actor) {
      and.push({
        OR: [
          { actorDisplay: { contains: filters.actor, mode: "insensitive" } },
          { actorId: { contains: filters.actor, mode: "insensitive" } }
        ]
      });
    }
    if (filters.query) {
      and.push({
        OR: [
          { targetId: { contains: filters.query, mode: "insensitive" } },
          { targetDisplay: { contains: filters.query, mode: "insensitive" } },
          { requestId: { contains: filters.query, mode: "insensitive" } },
          { eventName: { contains: filters.query, mode: "insensitive" } },
          { action: { contains: filters.query, mode: "insensitive" } }
        ]
      });
    }
    if (and.length > 0) {
      (where as { AND?: Record<string, unknown>[] }).AND = and;
    }

    const rows = await prisma.auditEvent.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: filters.take
    });

    const normalized = rows.map(normalizeRecordFromPrisma);
    return {
      source: "db",
      items: normalized.map(toListItem),
      total: normalized.length
    };
  } catch {
    const localRows = await readFallbackAuditEvents(5000);
    const filtered = localRows
      .filter((event) => (shopId ? event.shopId === shopId : true))
      .filter((event) => matchesFilter(event, filters))
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
      .slice(0, filters.take);

    return {
      source: "local-fallback",
      items: filtered.map(toListItem),
      total: filtered.length
    };
  }
}

export async function getAuditEventDetail(id: string, shopId?: string | null) {
  if (!shouldUsePrismaStore()) {
    const rows = await readFallbackAuditEvents(5000);
    const event = rows.find((entry) => entry.id === id && (shopId ? entry.shopId === shopId : true));
    return event || null;
  }

  try {
    const row = await prisma.auditEvent.findFirst({
      where: {
        id,
        ...(shopId ? { shopId } : {})
      }
    });
    if (!row) return null;
    return normalizeRecordFromPrisma(row);
  } catch {
    const rows = await readFallbackAuditEvents(5000);
    return rows.find((entry) => entry.id === id && (shopId ? entry.shopId === shopId : true)) || null;
  }
}

export async function exportAuditEvents(filters: AuditFilters, shopId?: string | null) {
  const source = shouldUsePrismaStore() ? "db" : "local-fallback";

  if (!shouldUsePrismaStore()) {
    const rows = await readFallbackAuditEvents(5000);
    return {
      source,
      rows: rows
        .filter((event) => (shopId ? event.shopId === shopId : true))
        .filter((event) => matchesFilter(event, filters))
        .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    };
  }

  try {
    const where: Record<string, unknown> = {};
    if (shopId) where.shopId = shopId;
    const from = parseDateBound(filters.from || null, false);
    const to = parseDateBound(filters.to || null, true);
    if (from || to) {
      where.occurredAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {})
      };
    }
    if (filters.eventCategory) where.eventCategory = filters.eventCategory;
    if (filters.eventName) where.eventName = filters.eventName;
    if (filters.targetType) where.targetType = filters.targetType;
    if (filters.channel) where.channel = filters.channel;
    if (filters.outcome) where.outcome = filters.outcome.toUpperCase();

    const rows = await prisma.auditEvent.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: 5000
    });

    return {
      source,
      rows: rows
        .map(normalizeRecordFromPrisma)
        .filter((event) => matchesFilter(event, filters))
    };
  } catch {
    const rows = await readFallbackAuditEvents(5000);
    return {
      source: "local-fallback",
      rows: rows
        .filter((event) => (shopId ? event.shopId === shopId : true))
        .filter((event) => matchesFilter(event, filters))
        .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    };
  }
}

export function asCsv(rows: AuditEventRecord[]) {
  const headers = [
    "occurredAt",
    "eventName",
    "eventCategory",
    "outcome",
    "severity",
    "actorDisplay",
    "actorRole",
    "targetType",
    "targetId",
    "targetDisplay",
    "action",
    "reasonCode",
    "reasonText",
    "channel",
    "requestId",
    "traceId",
    "sessionId",
    "route",
    "httpMethod"
  ];

  const escape = (value: unknown) => {
    const stringValue = value == null ? "" : String(value);
    if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
      return `"${stringValue.replace(/\"/g, "\"\"")}"`;
    }
    return stringValue;
  };

  const lines = rows.map((row) => [
    row.occurredAt,
    row.eventName,
    row.eventCategory,
    row.outcome,
    row.severity,
    maskDisplayValue(row.actorDisplay || row.actorId || undefined),
    row.actorRole || "",
    row.targetType || "",
    row.targetId || "",
    maskDisplayValue(row.targetDisplay || row.targetId || undefined),
    row.action,
    row.reasonCode || "",
    maskDisplayValue(row.reasonText || undefined),
    row.channel || "",
    row.requestId || "",
    row.traceId || "",
    row.sessionId || "",
    row.route || "",
    row.httpMethod || ""
  ].map(escape).join(","));

  return [headers.join(","), ...lines].join("\n");
}
