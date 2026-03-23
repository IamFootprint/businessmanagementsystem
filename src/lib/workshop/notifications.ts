import { ensureDir, getDataDir, readJson, resolveDataFile, writeJsonAtomic } from "@/src/lib/store/fsStore";
import type { NotificationChannel, NotificationStatus } from "@/lib/notifications/types";

export type NotificationEvent = {
  id: string;
  eventType: string;
  channel: NotificationChannel | string; // string allows legacy "WHATSAPP_STUB" etc.
  status: NotificationStatus;
  recipientPhone?: string;
  recipientEmail?: string;
  target?: string;
  actorProfileId?: string;
  customerPhone?: string; // legacy field, kept for backward compat
  subject?: string;
  message: string;
  bookingId?: string;
  bookingRef?: string;
  jobCardId?: string;
  jobCardRef?: string;
  invoiceId?: string;
  metadata?: Record<string, unknown>;
  attempts: number;
  lastError?: string;
  idempotencyKey?: string;
  createdAtIso: string;
  sentAtIso?: string;
};

const FILE = "notificationEvents.json";

function buildId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Normalize legacy _STUB channel values and missing fields */
function normalizeEvent(raw: Record<string, unknown>): NotificationEvent {
  let channel = (raw.channel as string) || "SYSTEM";
  channel = channel.replace(/_STUB$/, "");
  if (!["WHATSAPP", "EMAIL", "SYSTEM"].includes(channel)) channel = "SYSTEM";

  return {
    id: (raw.id as string) || buildId("ntf"),
    eventType: (raw.eventType as string) || "UNKNOWN",
    channel: channel as NotificationChannel,
    status: (raw.status as NotificationStatus) || "SENT",
    recipientPhone: (raw.recipientPhone as string) || (raw.customerPhone as string) || undefined,
    recipientEmail: (raw.recipientEmail as string) || undefined,
    target: (raw.target as string) || (raw.customerPhone as string) || undefined,
    actorProfileId: (raw.actorProfileId as string) || undefined,
    customerPhone: (raw.customerPhone as string) || undefined,
    subject: (raw.subject as string) || undefined,
    message: (raw.message as string) || "",
    bookingId: (raw.bookingId as string) || undefined,
    bookingRef: (raw.bookingRef as string) || undefined,
    jobCardId: (raw.jobCardId as string) || undefined,
    jobCardRef: (raw.jobCardRef as string) || undefined,
    invoiceId: (raw.invoiceId as string) || undefined,
    metadata: (raw.metadata as Record<string, unknown>) || undefined,
    attempts: typeof raw.attempts === "number" ? raw.attempts : 0,
    lastError: (raw.lastError as string) || undefined,
    idempotencyKey: (raw.idempotencyKey as string) || undefined,
    createdAtIso: (raw.createdAtIso as string) || new Date().toISOString(),
    sentAtIso: (raw.sentAtIso as string) || undefined,
  };
}

async function readEvents(): Promise<NotificationEvent[]> {
  const filePath = resolveDataFile(FILE);
  const rows = await readJson<Record<string, unknown>[]>(filePath, []);
  return rows.map(normalizeEvent);
}

async function writeEvents(events: NotificationEvent[]) {
  const dir = await ensureDir(getDataDir());
  if (!dir) return;
  const filePath = resolveDataFile(FILE);
  await writeJsonAtomic(filePath, events.slice(0, 1000));
}

export async function listNotificationEvents(limit = 200): Promise<NotificationEvent[]> {
  const rows = await readEvents();
  return rows.slice(0, limit);
}

export async function getNotificationByIdempotencyKey(key: string): Promise<NotificationEvent | null> {
  const rows = await readEvents();
  return rows.find((e) => e.idempotencyKey === key) || null;
}

export async function listQueuedEvents(limit = 50): Promise<NotificationEvent[]> {
  const rows = await readEvents();
  return rows.filter((e) => e.status === "QUEUED").reverse().slice(0, limit);
}

export async function logNotificationEvent(
  input: Omit<NotificationEvent, "id" | "createdAtIso" | "status" | "attempts"> & {
    id?: string;
    createdAtIso?: string;
    status?: NotificationStatus;
    attempts?: number;
  }
): Promise<NotificationEvent> {
  const current = await readEvents();
  const next: NotificationEvent = {
    ...input,
    id: input.id || buildId("ntf"),
    createdAtIso: input.createdAtIso || new Date().toISOString(),
    status: input.status || "SENT",
    attempts: input.attempts ?? 0,
    recipientPhone: input.recipientPhone || input.customerPhone || undefined,
    target: input.target || input.customerPhone,
  };
  current.unshift(next);
  await writeEvents(current);
  return next;
}

export async function updateNotificationEvent(
  id: string,
  updates: Partial<Pick<NotificationEvent, "status" | "attempts" | "lastError" | "sentAtIso">>
): Promise<NotificationEvent | null> {
  const current = await readEvents();
  const idx = current.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  current[idx] = { ...current[idx], ...updates };
  await writeEvents(current);
  return current[idx];
}

export async function requeueNotificationEvent(id: string): Promise<NotificationEvent | null> {
  return updateNotificationEvent(id, { status: "QUEUED", lastError: undefined, attempts: 0 });
}
