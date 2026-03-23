export type AuditEventCategory =
  | "auth"
  | "booking"
  | "pricing"
  | "availability"
  | "job_card"
  | "invoice"
  | "support"
  | "admin"
  | "security"
  | "system"
  | "platform"
  | "profile"
  | "catalog"
  | "inventory"
  | "notification"
  | "payment"
  | "export"
  | "legacy";

export type AuditSeverity = "info" | "warning" | "error" | "critical";

export type AuditOutcome = "success" | "failure";

export type AuditActorType = "user" | "system" | "api_key" | "webhook";

export type AuditRetentionClass = "standard" | "security" | "compliance" | "short";

export type AuditActor = {
  type?: AuditActorType;
  id?: string | null;
  display?: string | null;
  role?: string | null;
};

export type AuditTarget = {
  type?: string | null;
  id?: string | null;
  display?: string | null;
};

export type AuditRequestContext = {
  requestId?: string | null;
  traceId?: string | null;
  spanId?: string | null;
  sessionId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  channel?: string | null;
  route?: string | null;
  httpMethod?: string | null;
};

export type AuditEventInput = {
  eventName: string;
  eventCategory?: AuditEventCategory;
  severity?: AuditSeverity;
  outcome?: AuditOutcome;
  action?: string;
  subaction?: string | null;
  actor?: AuditActor;
  target?: AuditTarget;
  reasonCode?: string | null;
  reasonText?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
  changedFields?: string[];
  contextJson?: unknown;
  occurredAt?: Date | string;
  requestContext?: AuditRequestContext;
  tenantId?: string | null;
  shopId?: string | null;
  environment?: string;
  serviceName?: string;
  serviceVersion?: string | null;
  isSensitive?: boolean;
  retentionClass?: AuditRetentionClass;
};

export type PersistedAuditEvent = {
  id: string;
  occurredAt: string;
  recordedAt: string;
  eventName: string;
  eventCategory: string;
  severity: AuditSeverity;
  outcome: AuditOutcome;
  actorType: AuditActorType;
  actorId?: string | null;
  actorDisplay?: string | null;
  actorRole?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetDisplay?: string | null;
  action: string;
  subaction?: string | null;
  reasonCode?: string | null;
  reasonText?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
  changedFields: string[];
  contextJson?: unknown;
  requestId?: string | null;
  traceId?: string | null;
  spanId?: string | null;
  sessionId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  channel?: string | null;
  route?: string | null;
  httpMethod?: string | null;
  tenantId?: string | null;
  environment: string;
  serviceName: string;
  serviceVersion?: string | null;
  isSensitive: boolean;
  retentionClass: AuditRetentionClass;
  shopId?: string | null;
};
