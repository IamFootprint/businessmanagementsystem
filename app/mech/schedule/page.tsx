"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge, type BookingStatus } from "@/app/components/StatusBadge";
import { formatDateTimeZA } from "@/lib/format/date";
type JobCard = {
  id: string;
  ref: string;
  customerName?: string;
  serviceName?: string;
  slotIso: string;
  status: string;
  addressLine1: string;
};

type ViewMode = "day" | "week" | "month";
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Johannesburg"
  }).format(new Date());
}

function parseIsoDateUtc(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDateUtc(value: Date) {
  return value.toISOString().slice(0, 10);
}

function startOfWeekMonday(anchorIso: string) {
  const date = parseIsoDateUtc(anchorIso);
  const diffToMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diffToMonday);
  return date;
}

function weekKeys(anchorIso: string) {
  const start = startOfWeekMonday(anchorIso);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setUTCDate(start.getUTCDate() + index);
    return toIsoDateUtc(next);
  });
}

function monthWeekRows(anchorIso: string) {
  const anchor = parseIsoDateUtc(anchorIso);
  const monthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));

  const gridStart = startOfWeekMonday(toIsoDateUtc(monthStart));
  const gridEnd = new Date(monthEnd);
  const daysToSunday = (7 - gridEnd.getUTCDay()) % 7;
  gridEnd.setUTCDate(gridEnd.getUTCDate() + daysToSunday);

  const days: string[] = [];
  for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    days.push(toIsoDateUtc(cursor));
  }

  const rows: string[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }
  return rows;
}

function slotDateKey(slotIso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Johannesburg"
  }).format(new Date(slotIso));
}

function dateHeading(dateIso: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    timeZone: "Africa/Johannesburg"
  }).format(parseIsoDateUtc(dateIso));
}

function slotTime(slotIso: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Johannesburg"
  }).format(new Date(slotIso));
}

function normalizeStatus(status: string): BookingStatus {
  return status.toLowerCase().replace(/_/g, "_") as BookingStatus;
}

export default function MechSchedulePage() {
  const [view, setView] = useState<ViewMode>("day");
  const [anchor, setAnchor] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);

  async function loadSchedule(nextView = view, nextAnchor = anchor) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ view: nextView, anchor: nextAnchor });
      const res = await fetch(`/api/mech/schedule?${params.toString()}`);
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && String(raw?.error || "").toLowerCase().includes("complete profile")) {
          window.location.href = "/mech/profile";
          return;
        }
        setError("Failed to load planned schedule.");
        setJobCards([]);
        return;
      }
      const data = raw.data ?? raw;
      setJobCards(data.jobCards || []);
      if (typeof data.anchor === "string") {
        setAnchor(data.anchor);
      }
    } catch {
      setError("Failed to load planned schedule.");
      setJobCards([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSchedule(view, anchor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor]);

  const jobsByDate = useMemo(() => {
    const map = new Map<string, JobCard[]>();
    for (const card of jobCards) {
      const key = slotDateKey(card.slotIso);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    for (const [, cards] of map) {
      cards.sort((a, b) => a.slotIso.localeCompare(b.slotIso));
    }
    return map;
  }, [jobCards]);

  const groupedByDate = useMemo(
    () => [...jobsByDate.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    [jobsByDate]
  );
  const weekColumns = useMemo(() => weekKeys(anchor), [anchor]);
  const monthRows = useMemo(() => monthWeekRows(anchor), [anchor]);
  const anchorMonth = useMemo(() => parseIsoDateUtc(anchor).getUTCMonth(), [anchor]);

  function renderJobChip(card: JobCard) {
    return (
      <a
        key={card.id}
        href={`/mech/job/${card.id}`}
        className="block rounded-md border border-border bg-muted/50 p-2 hover:bg-muted transition-colors text-xs"
      >
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <strong className="font-semibold">{slotTime(card.slotIso)}</strong>
          <StatusBadge status={normalizeStatus(card.status)} className="text-[9px] px-1.5 py-0" />
        </div>
        <div className="font-medium text-foreground truncate">{card.customerName || "Customer"}</div>
        <div className="text-muted-foreground truncate">{card.serviceName || "Service"}</div>
      </a>
    );
  }

  const viewButtons: ViewMode[] = ["day", "week", "month"];

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-foreground text-lg">Planned schedule</h2>
        <p className="text-sm text-muted-foreground mb-4">Switch between day, week, and month views for your assigned jobs.</p>
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit mb-4">
          {viewButtons.map((v) => (
            <button
              key={v}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setView(v)}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
          <input
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
            type="date"
            value={anchor}
            onChange={(event) => setAnchor(event.target.value)}
          />
          <Button className="w-full sm:w-auto min-h-[44px]" variant="outline" onClick={() => loadSchedule(view, anchor)}>
            Refresh schedule
          </Button>
          <a href="/mech/bookings/new" className="w-full sm:w-auto">
            <Button className="w-full min-h-[44px]">Add customer booking</Button>
          </a>
        </div>
        {loading ? <p className="mt-4 text-sm text-muted-foreground">Loading schedule...</p> : null}
        {error ? <p className="text-sm text-destructive mt-3">{error}</p> : null}
      </div>

      {/* Schedule view */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-foreground text-lg mb-4">
          {view[0].toUpperCase() + view.slice(1)} view schedule
        </h2>
        {!loading && groupedByDate.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assigned jobs in this time range.</p>
        ) : null}

        {/* Day view */}
        {view === "day" ? (
          <div className="flex flex-col gap-4">
            {groupedByDate.map(([dateIso, cards]) => (
              <div key={dateIso} className="rounded-lg border border-border p-4">
                <h3 className="font-semibold text-foreground mb-3">{dateHeading(dateIso)}</h3>
                <div className="flex flex-col gap-3">
                  {cards.map((card) => (
                    <div key={card.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm font-semibold text-foreground">{card.ref}</strong>
                          <StatusBadge status={normalizeStatus(card.status)} />
                        </div>
                        <div className="text-sm text-muted-foreground">{card.customerName || "Customer"}</div>
                        <div className="text-sm text-muted-foreground">{card.serviceName || "Service"}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTimeZA(card.slotIso)}</div>
                        <div className="text-xs text-muted-foreground truncate">{card.addressLine1}</div>
                      </div>
                      <div className="flex sm:flex-col sm:items-end gap-2">
                        <Button className="w-full sm:w-auto min-h-[44px]" size="sm" onClick={() => (window.location.href = `/mech/job/${card.id}`)}>
                          Open job
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Week view */}
        {view === "week" ? (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[700px]">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="p-2 text-center text-xs font-semibold text-muted-foreground border-b border-border">
                  {label}
                </div>
              ))}
              {weekColumns.map((dateIso) => (
                <div key={dateIso} className="border-r border-b border-border last:border-r-0 min-h-[120px] p-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{dateHeading(dateIso)}</div>
                  <div className="flex flex-col gap-1">
                    {(jobsByDate.get(dateIso) || []).map(renderJobChip)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Month view */}
        {view === "month" ? (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="p-2 text-center text-xs font-semibold text-muted-foreground border-b border-border">
                    {label}
                  </div>
                ))}
              </div>
              {monthRows.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`} className="grid grid-cols-7">
                  {row.map((dateIso) => (
                    <div
                      key={dateIso}
                      className={`border-r border-b border-border last:border-r-0 min-h-[80px] p-1.5 ${
                        parseIsoDateUtc(dateIso).getUTCMonth() !== anchorMonth ? "opacity-40" : ""
                      }`}
                    >
                      <div className="text-[10px] font-medium text-muted-foreground mb-0.5">{dateHeading(dateIso)}</div>
                      <div className="flex flex-col gap-0.5">
                        {(jobsByDate.get(dateIso) || []).map(renderJobChip)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
