import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureDir, getDataDir, readJson, resolveDataFile, writeJsonAtomic } from "@/src/lib/store/fsStore";
import { computeChangedFields } from "./diff";
import { redactAuditValue } from "./redaction";
import { resolveAuditRequestContext } from "./request-context";
import type {
  AuditActorType,
  AuditEventCategory,
  AuditEventInput,
  AuditOutcome,
  AuditRetentionClass,
  AuditSeverity,
  PersistedAuditEvent
} from "./types";

const FALLBACK_FILE = "auditEvents.json";
const LEGACY_FALLBACK_FILE = "auditLogs.json";

const SEVERITY_MAP: Record<AuditSeverity, "INFO" | "WARNING" | "ERROR" | "CRITICAL"> = {
  info: "INFO",
  warning: "WARNING",
  error: "ERROR",
  critical: "CRITICAL"
};

const OUTCOME_MAP: Record<AuditOutcome, "SUCCESS" | "FAILURE"> = {
  success: "SUCCESS",
  failure: "FAILURE"
};

const ACTOR_TYPE_MAP: Record<AuditActorType, "USER" | "SYSTEM" | "API_KEY" | "WEBHOOK"> = {
  user: "USER",
  system: "SYSTEM",
  api_key: "API_KEY",
  webhook: "WEBHOOK"
};

const SERVICE_NAME = process.env.AUDIT_SERVICE_NAME || "cycledesk-web";
const SERVICE_VERSION = process.env.SERVICE_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || null;
const ENVIRONMENT = process.env.NODE_ENV || "development";

function createFallbackId() {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeDate(value: Date | string | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeEventCategory(eventName: string, eventCategory?: AuditEventCategory): AuditEventCategory {
  if (eventCategory) return eventCategory;
  const root = eventName.split(".")[0]?.toLowerCase();
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

function toJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value == null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function normalizeAction(input: AuditEventInput): string {
  if (input.action && input.action.trim()) return input.action.trim();
  const token = input.eventName.split(".").at(-1) || input.eventName;
  return token.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
}

function shouldUsePrismaStore() {
  return process.env.DATA_MODE === "prisma";
}

async function writeFallbackEvent(event: PersistedAuditEvent) {
  try {
    const dir = await ensureDir(getDataDir());
    if (!dir) return;
    const filePath = resolveDataFile(FALLBACK_FILE);
    const current = await readJson<PersistedAuditEvent[]>(filePath, []);
    current.unshift(event);
    await writeJsonAtomic(filePath, current.slice(0, 5000));
  } catch {
    // Audit fallback failures must not break business flows.
  }
}

export async function readFallbackAuditEvents(limit = 200): Promise<PersistedAuditEvent[]> {
  const filePath = resolveDataFile(FALLBACK_FILE);
  const rows = await readJson<PersistedAuditEvent[]>(filePath, []);
  if (rows.length > 0) {
    return rows.slice(0, limit);
  }

  const legacyFilePath = resolveDataFile(LEGACY_FALLBACK_FILE);
  const legacyRows = await readJson<Array<{
    id: string;
    actor?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    metadata?: unknown;
    createdAt: string;
  }>>(legacyFilePath, []);

  return legacyRows.map<PersistedAuditEvent>((entry) => ({
    id: `legacy_${entry.id}`,
    occurredAt: entry.createdAt,
    recordedAt: entry.createdAt,
    eventName: entry.action,
    eventCategory: normalizeEventCategory(entry.action),
    severity: "info",
    outcome: "success",
    actorType: entry.actor ? "user" : "system",
    actorId: null,
    actorDisplay: entry.actor || null,
    actorRole: null,
    targetType: entry.entity,
    targetId: entry.entityId || null,
    targetDisplay: entry.entityId || null,
    action: entry.action,
    subaction: null,
    reasonCode: null,
    reasonText: null,
    beforeJson: null,
    afterJson: null,
    changedFields: [],
    contextJson: entry.metadata || null,
    requestId: null,
    traceId: null,
    spanId: null,
    sessionId: null,
    ipAddress: null,
    userAgent: null,
    deviceId: null,
    channel: "legacy",
    route: null,
    httpMethod: null,
    tenantId: null,
    environment: "legacy",
    serviceName: "legacy_audit",
    serviceVersion: null,
    isSensitive: false,
    retentionClass: "standard",
    shopId: null
  })).slice(0, limit);
}

export function normalizeAuditEventInput(input: AuditEventInput, request?: Request): PersistedAuditEvent {
  const occurredAt = normalizeDate(input.occurredAt);
  const recordedAt = new Date();
  const eventName = input.eventName.trim();
  const eventCategory = normalizeEventCategory(eventName, input.eventCategory);
  const severity = input.severity || "info";
  const outcome = input.outcome || "success";

  const beforeJson = redactAuditValue(input.beforeJson);
  const afterJson = redactAuditValue(input.afterJson);
  const contextJson = redactAuditValue(input.contextJson);

  const changedFields =
    input.changedFields && input.changedFields.length > 0
      ? Array.from(new Set(input.changedFields.map((field) => field.trim()).filter(Boolean))).sort()
      : computeChangedFields(beforeJson, afterJson);

  const requestContext = {
    ...resolveAuditRequestContext(request),
    ...(input.requestContext || {})
  };

  const actorType = input.actor?.type || (input.actor?.id || input.actor?.display ? "user" : "system");

  return {
    id: createFallbackId(),
    occurredAt: occurredAt.toISOString(),
    recordedAt: recordedAt.toISOString(),
    eventName,
    eventCategory,
    severity,
    outcome,
    actorType,
    actorId: input.actor?.id || null,
    actorDisplay: input.actor?.display || null,
    actorRole: input.actor?.role || null,
    targetType: input.target?.type || null,
    targetId: input.target?.id || null,
    targetDisplay: input.target?.display || null,
    action: normalizeAction(input),
    subaction: input.subaction || null,
    reasonCode: input.reasonCode || null,
    reasonText: input.reasonText || null,
    beforeJson,
    afterJson,
    changedFields,
    contextJson,
    requestId: requestContext.requestId || null,
    traceId: requestContext.traceId || null,
    spanId: requestContext.spanId || null,
    sessionId: requestContext.sessionId || null,
    ipAddress: requestContext.ipAddress || null,
    userAgent: requestContext.userAgent || null,
    deviceId: requestContext.deviceId || null,
    channel: requestContext.channel || null,
    route: requestContext.route || null,
    httpMethod: requestContext.httpMethod || null,
    tenantId: input.tenantId || null,
    environment: input.environment || ENVIRONMENT,
    serviceName: input.serviceName || SERVICE_NAME,
    serviceVersion: input.serviceVersion || SERVICE_VERSION,
    isSensitive: Boolean(input.isSensitive),
    retentionClass: (input.retentionClass || "standard") as AuditRetentionClass,
    shopId: input.shopId || null
  };
}

export async function logAuditEvent(input: AuditEventInput, request?: Request) {
  const normalized = normalizeAuditEventInput(input, request);

  if (!shouldUsePrismaStore()) {
    await writeFallbackEvent(normalized);
    return normalized;
  }

  try {
    await prisma.auditEvent.create({
      data: {
        id: normalized.id,
        occurredAt: new Date(normalized.occurredAt),
        recordedAt: new Date(normalized.recordedAt),
        eventName: normalized.eventName,
        eventCategory: normalized.eventCategory,
        severity: SEVERITY_MAP[normalized.severity],
        outcome: OUTCOME_MAP[normalized.outcome],
        actorType: ACTOR_TYPE_MAP[normalized.actorType],
        actorId: normalized.actorId,
        actorDisplay: normalized.actorDisplay,
        actorRole: normalized.actorRole,
        targetType: normalized.targetType,
        targetId: normalized.targetId,
        targetDisplay: normalized.targetDisplay,
        action: normalized.action,
        subaction: normalized.subaction,
        reasonCode: normalized.reasonCode,
        reasonText: normalized.reasonText,
        beforeJson: toJsonValue(normalized.beforeJson),
        afterJson: toJsonValue(normalized.afterJson),
        changedFields: normalized.changedFields,
        contextJson: toJsonValue(normalized.contextJson),
        requestId: normalized.requestId,
        traceId: normalized.traceId,
        spanId: normalized.spanId,
        sessionId: normalized.sessionId,
        ipAddress: normalized.ipAddress,
        userAgent: normalized.userAgent,
        deviceId: normalized.deviceId,
        channel: normalized.channel,
        route: normalized.route,
        httpMethod: normalized.httpMethod,
        tenantId: normalized.tenantId,
        environment: normalized.environment,
        serviceName: normalized.serviceName,
        serviceVersion: normalized.serviceVersion,
        isSensitive: normalized.isSensitive,
        retentionClass: normalized.retentionClass,
        shopId: normalized.shopId
      }
    });
    return normalized;
  } catch {
    await writeFallbackEvent(normalized);
    return normalized;
  }
}
