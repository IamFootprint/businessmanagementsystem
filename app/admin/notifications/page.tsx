"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import ErrorState from "@/app/components/ErrorState";
import { useNotify } from "@/app/components/ToastProvider";
import { apiFetch, getErrorHint, isApiClientError } from "@/lib/client/api";
import { formatDateTimeZA } from "@/lib/format/date";
type NotificationEvent = {
  id: string;
  eventType: string;
  channel: string;
  message: string;
  status: "QUEUED" | "SENT" | "FAILED" | "OPTED_OUT";
  target?: string;
  bookingRef?: string;
  jobCardRef?: string;
  createdAtIso: string;
  lastError?: string;
};

export default function NotificationsPage() {
  const notify = useNotify();
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const data = await apiFetch<{ events: NotificationEvent[] }>("/api/admin/notifications");
      setEvents(data.events || []);
    } catch (error) {
      setError("We couldn't load the notification log.");
      setHint(getErrorHint(error, "Check your connection or try again.") || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const types = useMemo(
    () => ["ALL", ...Array.from(new Set(events.map((event) => event.eventType))).sort()],
    [events]
  );

  const filtered = useMemo(() => {
    return events.filter((event) => {
      const matchesStatus = statusFilter === "ALL" || event.status === statusFilter;
      const matchesType = typeFilter === "ALL" || event.eventType === typeFilter;
      const haystack = `${event.eventType} ${event.message} ${event.target || ""} ${event.bookingRef || ""} ${event.jobCardRef || ""}`.toLowerCase();
      const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());
      return matchesStatus && matchesType && matchesQuery;
    });
  }, [events, query, statusFilter, typeFilter]);

  async function resend(eventId: string) {
    setResendingId(eventId);
    try {
      const data = await apiFetch<{ event: NotificationEvent }>("/api/admin/notifications/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId })
      });
      setEvents((prev) => prev.map((event) => (event.id === eventId ? data.event : event)));
      notify.success("Notification re-queued", "The event is marked for resend.");
    } catch (error) {
      notify.error(
        "Resend failed",
        error instanceof Error ? error.message : "Try again.",
        getErrorHint(error, "Try again or contact support."),
        isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
      );
    } finally {
      setResendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">System</p>
            <h1>Notification log</h1>
            <p>Debug event creation for in-app communication and outbound delivery.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 mt-4">
          <LabeledInput label="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Status</span>
            <select className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="QUEUED">Queued</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="OPTED_OUT">Opted out</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Type</span>
            <select className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type === "ALL" ? "All event types" : type}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        {loading ? <p className="text-sm text-muted-foreground mt-3">Loading notifications…</p> : null}
        {!loading && error ? (
          <ErrorState title="Notification log unavailable" message={error} hint={hint || undefined} onRetry={load} />
        ) : null}

        {!loading && !error ? (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Message</th>
                  <th>Reference</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No notification events match your filters.</td>
                  </tr>
                ) : null}
                {filtered.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <strong>{event.eventType}</strong>
                      <span className="block text-xs text-muted-foreground">{event.channel.toUpperCase()}</span>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${event.status === "FAILED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : event.status === "QUEUED" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : event.status === "OPTED_OUT" ? "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}>
                        {event.status}
                      </span>
                    </td>
                    <td>
                      <span>{event.message}</span>
                      {event.lastError ? <span className="block text-xs text-destructive">{event.lastError}</span> : null}
                    </td>
                    <td>
                      {event.target ? `Target ${event.target}` : "No target"}
                      {event.bookingRef ? <span className="block text-xs text-muted-foreground">Booking {event.bookingRef}</span> : null}
                      {event.jobCardRef ? <span className="block text-xs text-muted-foreground">Job {event.jobCardRef}</span> : null}
                    </td>
                    <td>{formatDateTimeZA(event.createdAtIso)}</td>
                    <td>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resend(event.id)}
                        disabled={resendingId === event.id}
                      >
                        {resendingId === event.id ? "Re-queueing..." : "Re-queue"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
