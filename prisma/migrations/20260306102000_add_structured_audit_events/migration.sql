-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'SYSTEM', 'API_KEY', 'WEBHOOK');

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventName" TEXT NOT NULL,
    "eventCategory" TEXT NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "outcome" "AuditOutcome" NOT NULL DEFAULT 'SUCCESS',
    "actorType" "AuditActorType" NOT NULL DEFAULT 'USER',
    "actorId" TEXT,
    "actorDisplay" TEXT,
    "actorRole" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "targetDisplay" TEXT,
    "action" TEXT NOT NULL,
    "subaction" TEXT,
    "reasonCode" TEXT,
    "reasonText" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "changedFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "contextJson" JSONB,
    "requestId" TEXT,
    "traceId" TEXT,
    "spanId" TEXT,
    "sessionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "channel" TEXT,
    "route" TEXT,
    "httpMethod" TEXT,
    "tenantId" TEXT,
    "environment" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "serviceVersion" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "retentionClass" TEXT NOT NULL DEFAULT 'standard',
    "shopId" TEXT,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "audit_events"
ADD CONSTRAINT "audit_events_shopId_fkey"
FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "audit_events_occurredAt_idx" ON "audit_events"("occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_shopId_occurredAt_idx" ON "audit_events"("shopId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_actorType_actorId_occurredAt_idx" ON "audit_events"("actorType", "actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_targetType_targetId_occurredAt_idx" ON "audit_events"("targetType", "targetId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_eventName_idx" ON "audit_events"("eventName");

-- CreateIndex
CREATE INDEX "audit_events_outcome_idx" ON "audit_events"("outcome");

-- CreateIndex
CREATE INDEX "audit_events_requestId_idx" ON "audit_events"("requestId");

-- CreateIndex
CREATE INDEX "audit_events_traceId_idx" ON "audit_events"("traceId");

-- Backfill from legacy audit_logs table
INSERT INTO "audit_events" (
  "id",
  "occurredAt",
  "recordedAt",
  "eventName",
  "eventCategory",
  "severity",
  "outcome",
  "actorType",
  "actorId",
  "actorDisplay",
  "actorRole",
  "targetType",
  "targetId",
  "targetDisplay",
  "action",
  "subaction",
  "reasonCode",
  "reasonText",
  "beforeJson",
  "afterJson",
  "changedFields",
  "contextJson",
  "requestId",
  "traceId",
  "spanId",
  "sessionId",
  "ipAddress",
  "userAgent",
  "deviceId",
  "channel",
  "route",
  "httpMethod",
  "tenantId",
  "environment",
  "serviceName",
  "serviceVersion",
  "isSensitive",
  "retentionClass",
  "shopId"
)
SELECT
  CONCAT('legacy_', "id") AS "id",
  "createdAt" AS "occurredAt",
  "createdAt" AS "recordedAt",
  "action" AS "eventName",
  CASE
    WHEN POSITION('.' IN "action") > 0 THEN SPLIT_PART("action", '.', 1)
    ELSE 'legacy'
  END AS "eventCategory",
  'INFO'::"AuditSeverity" AS "severity",
  'SUCCESS'::"AuditOutcome" AS "outcome",
  CASE WHEN "actor" IS NULL THEN 'SYSTEM'::"AuditActorType" ELSE 'USER'::"AuditActorType" END AS "actorType",
  NULL AS "actorId",
  "actor" AS "actorDisplay",
  NULL AS "actorRole",
  "entity" AS "targetType",
  "entityId" AS "targetId",
  "entityId" AS "targetDisplay",
  "action" AS "action",
  NULL AS "subaction",
  NULL AS "reasonCode",
  NULL AS "reasonText",
  NULL AS "beforeJson",
  NULL AS "afterJson",
  ARRAY[]::TEXT[] AS "changedFields",
  "metadata" AS "contextJson",
  NULL AS "requestId",
  NULL AS "traceId",
  NULL AS "spanId",
  NULL AS "sessionId",
  NULL AS "ipAddress",
  NULL AS "userAgent",
  NULL AS "deviceId",
  'legacy' AS "channel",
  NULL AS "route",
  NULL AS "httpMethod",
  NULL AS "tenantId",
  'legacy' AS "environment",
  'legacy_audit' AS "serviceName",
  NULL AS "serviceVersion",
  false AS "isSensitive",
  'standard' AS "retentionClass",
  "shopId" AS "shopId"
FROM "audit_logs";

-- Prevent mutations to preserve append-only semantics.
CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

CREATE TRIGGER audit_events_no_update
BEFORE UPDATE ON "audit_events"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_event_mutation();

CREATE TRIGGER audit_events_no_delete
BEFORE DELETE ON "audit_events"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_event_mutation();

COMMENT ON TABLE "audit_events" IS 'Immutable business audit trail events. Rows are append-only.';
