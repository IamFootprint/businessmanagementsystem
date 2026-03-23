"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import ActionModal from "@/app/components/ActionModal";
import ErrorState from "@/app/components/ErrorState";
import IconAction from "@/app/components/IconAction";
import { apiFetch, getErrorHint } from "@/lib/client/api";
import { formatDateTimeZA } from "@/lib/format/date";
import { FileDown, FileJson } from "lucide-react";
type AuditListItem = {
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

type AuditListResponse = {
  items: AuditListItem[];
  total: number;
  source: string;
};

type AuditDetail = {
  id: string;
  occurredAt: string;
  recordedAt: string;
  eventName: string;
  eventCategory: string;
  severity: string;
  outcome: string;
  actorType: string;
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
  environment: string;
  serviceName: string;
  serviceVersion?: string | null;
  isSensitive: boolean;
  retentionClass: string;
};

function buildSearchParams(filters: {
  from: string;
  to: string;
  actor: string;
  eventCategory: string;
  eventName: string;
  targetType: string;
  outcome: string;
  channel: string;
  query: string;
  take: number;
}) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.actor) params.set("actor", filters.actor);
  if (filters.eventCategory) params.set("eventCategory", filters.eventCategory);
  if (filters.eventName) params.set("eventName", filters.eventName);
  if (filters.targetType) params.set("targetType", filters.targetType);
  if (filters.outcome) params.set("outcome", filters.outcome);
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.query) params.set("q", filters.query);
  params.set("take", String(filters.take));
  return params;
}

function renderJson(value: unknown) {
  if (value == null) return "{}";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AuditPage() {
  const [items, setItems] = useState<AuditListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actor, setActor] = useState("");
  const [eventCategory, setEventCategory] = useState("");
  const [eventName, setEventName] = useState("");
  const [targetType, setTargetType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [channel, setChannel] = useState("");
  const [query, setQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const filters = useMemo(
    () => ({
      from,
      to,
      actor,
      eventCategory,
      eventName,
      targetType,
      outcome,
      channel,
      query,
      take: 300
    }),
    [actor, channel, eventCategory, eventName, from, outcome, query, targetType, to]
  );

  const queryString = useMemo(() => buildSearchParams(filters).toString(), [filters]);

  const eventCategoryOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.eventCategory).filter(Boolean))).sort(),
    [items]
  );
  const eventNameOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.eventName).filter(Boolean))).sort(),
    [items]
  );
  const targetTypeOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.targetType).filter((value): value is string => Boolean(value)))).sort(),
    [items]
  );
  const channelOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.channel).filter((value): value is string => Boolean(value)))).sort(),
    [items]
  );

  async function loadList() {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const payload = await apiFetch<AuditListResponse>(`/api/admin/audit?${queryString}`);
      setItems(payload.items || []);
    } catch (loadError) {
      setError("We could not load the audit trail right now.");
      setHint(getErrorHint(loadError, "Retry in a moment.") || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadList();
  }, [queryString]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    let active = true;

    async function loadDetail() {
      setDetailLoading(true);
      try {
        const payload = await apiFetch<{ event: AuditDetail }>(`/api/admin/audit/${selectedId}`);
        if (!active) return;
        setDetail(payload.event || null);
      } catch {
        if (!active) return;
        setDetail(null);
      } finally {
        if (!active) return;
        setDetailLoading(false);
      }
    }

    void loadDetail();
    return () => {
      active = false;
    };
  }, [selectedId]);

  function clearFilters() {
    setFrom("");
    setTo("");
    setActor("");
    setEventCategory("");
    setEventName("");
    setTargetType("");
    setOutcome("");
    setChannel("");
    setQuery("");
  }

  function handleExport(format: "csv" | "json") {
    const params = buildSearchParams(filters);
    params.set("format", format);
    window.location.href = `/api/admin/audit/export?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">System</p>
            <h1>Audit trail</h1>
            <p>Investigate operational and security events across bookings, auth, and admin actions.</p>
          </div>
          <div className="flex items-center gap-2">
            <IconAction icon={FileDown} label="Export CSV" variant="outline" size="sm" onClick={() => handleExport("csv")} />
            <IconAction icon={FileJson} label="Export JSON" variant="outline" size="sm" onClick={() => handleExport("json")} />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">From</span>
            <input className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">To</span>
            <input className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Search</span>
            <input
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Target id, booking ref, invoice no, request id"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Outcome</span>
            <select className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={outcome} onChange={(event) => setOutcome(event.target.value)}>
              <option value="">All outcomes</option>
              <option value="success">success</option>
              <option value="failure">failure</option>
            </select>
          </label>
          <Button variant="outline" size="sm" onClick={() => setShowAdvanced((prev) => !prev)}>
            {showAdvanced ? "Hide advanced" : "Show advanced"}
          </Button>
          <Button variant="outline" size="sm" onClick={clearFilters}>Clear</Button>
        </div>
        {showAdvanced ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Actor</span>
              <input
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={actor}
                onChange={(event) => setActor(event.target.value)}
                placeholder="Actor id or display"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Category</span>
              <select className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={eventCategory} onChange={(event) => setEventCategory(event.target.value)}>
                <option value="">All categories</option>
                {eventCategoryOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Event</span>
              <select className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={eventName} onChange={(event) => setEventName(event.target.value)}>
                <option value="">All events</option>
                {eventNameOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Target type</span>
              <select className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={targetType} onChange={(event) => setTargetType(event.target.value)}>
                <option value="">All target types</option>
                {targetTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Channel</span>
              <select className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={channel} onChange={(event) => setChannel(event.target.value)}>
                <option value="">All channels</option>
                {channelOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {loading ? <p className="text-sm text-muted-foreground">Loading audit events…</p> : null}
        {!loading && error ? <ErrorState title="Audit unavailable" message={error} hint={hint || undefined} onRetry={loadList} /> : null}

        {!loading && !error ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Actor</th>
                  <th>Target</th>
                  <th>Outcome</th>
                  <th>Channel</th>
                  <th>Request ID</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No audit events matched your filters.</td>
                  </tr>
                ) : null}
                {items.map((item) => (
                  <tr key={item.id} role="button" onClick={() => setSelectedId(item.id)} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <td>{formatDateTimeZA(item.occurredAt)}</td>
                    <td>
                      <strong>{item.eventName}</strong>
                      <div className="text-sm text-muted-foreground">{item.eventCategory}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{item.actorDisplay || "System"}</span>
                      {item.actorRole ? (
                        <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: 2 }}>{item.actorRole}</div>
                      ) : null}
                    </td>
                    <td>
                      <strong>{item.targetDisplay}</strong>
                      <div className="text-sm text-muted-foreground">{item.targetType || "—"}</div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.outcome === "failure" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}>
                        {item.outcome}
                      </span>
                    </td>
                    <td>{item.channel || "—"}</td>
                    <td><code>{item.requestId || "—"}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <ActionModal
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title={detail?.eventName || "Audit event"}
        description={detail ? `${formatDateTimeZA(detail.occurredAt)} · ${detail.eventCategory}` : "Loading event detail"}
        size="lg"
      >
        {detailLoading ? <p className="text-sm text-muted-foreground">Loading detail…</p> : null}
        {!detailLoading && !detail ? <p className="text-sm text-muted-foreground">Unable to load this event detail.</p> : null}

        {!detailLoading && detail ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border p-4">
              <p><strong>Summary</strong></p>
              <p>{detail.action} on {detail.targetType || "record"} {detail.targetDisplay || detail.targetId || "—"}</p>
              <p>
                <span style={{ fontWeight: 500 }}>Actor: {detail.actorDisplay || detail.actorId || "System"}</span>
                {detail.actorRole ? (
                  <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", marginLeft: 6 }}>{detail.actorRole}</span>
                ) : (
                  <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", marginLeft: 6 }}>{detail.actorType}</span>
                )}
              </p>
              <p>Outcome: {detail.outcome} · Severity: {detail.severity}</p>
            </div>

            <div className="rounded-lg border border-border p-4">
              <p><strong>Reason</strong></p>
              <p>Code: {detail.reasonCode || "—"}</p>
              <p>Text: {detail.reasonText || "—"}</p>
            </div>

            <div className="rounded-lg border border-border p-4">
              <p><strong>Before</strong></p>
              <pre className="mt-1 rounded-lg bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap">{renderJson(detail.beforeJson)}</pre>
            </div>

            <div className="rounded-lg border border-border p-4">
              <p><strong>After</strong></p>
              <pre className="mt-1 rounded-lg bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap">{renderJson(detail.afterJson)}</pre>
              <p><strong>Changed fields</strong>: {detail.changedFields.length > 0 ? detail.changedFields.join(", ") : "—"}</p>
            </div>

            <div className="rounded-lg border border-border p-4">
              <p><strong>Context JSON</strong></p>
              <pre className="mt-1 rounded-lg bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap">{renderJson(detail.contextJson)}</pre>
            </div>

            <div className="rounded-lg border border-border p-4">
              <p><strong>Request / Trace</strong></p>
              <p>Request: <code>{detail.requestId || "—"}</code></p>
              <p>Trace: <code>{detail.traceId || "—"}</code></p>
              <p>Span: <code>{detail.spanId || "—"}</code></p>
              <p>Session: <code>{detail.sessionId || "—"}</code></p>
              <p>IP: <code>{detail.ipAddress || "—"}</code></p>
              <p>User-Agent: <code>{detail.userAgent || "—"}</code></p>
              <p>Route: <code>{detail.httpMethod || "—"} {detail.route || "—"}</code></p>
            </div>
          </div>
        ) : null}
      </ActionModal>
    </div>
  );
}
