"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import BookingStatusBadge from "@/app/components/BookingStatusBadge";
type Booking = {
  id: string;
  ref?: string;
  referenceCode?: string;
  customerName: string;
  serviceNameSnapshot?: string;
  packageType?: string;
  slotIso?: string;
  scheduledStart?: string;
  status: string;
};

type Block = {
  id: string;
  startsAtIso?: string;
  endsAtIso?: string;
  date?: string;
  reason?: string;
};

type ViewMode = "day" | "week" | "month";
type CalendarItem = {
  id: string;
  kind: "BOOKING" | "BLOCK";
  atIso: string;
  endIso?: string;
  title: string;
  sub: string;
  status: string;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const inputClass = "h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

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

function slotDateKey(slotIso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Johannesburg"
  }).format(new Date(slotIso));
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

export default function AdminCalendarPage() {
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(todayIso());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        const [bookingsRes, blocksRes] = await Promise.all([
          fetch("/api/public/bookings"),
          fetch("/api/admin/availability/blocks")
        ]);
        const bookingsRaw = await bookingsRes.json().catch(() => ({}));
        const blocksRaw = await blocksRes.json().catch(() => ({}));
        const bookingsData = bookingsRaw.data ?? bookingsRaw;
        const blocksData = blocksRaw.data ?? blocksRaw;
        setBookings(bookingsData.bookings || []);
        setBlocks(blocksData.blocks || []);
      } catch {
        setError("Failed to load calendar data.");
      }
    }
    void load();
  }, []);

  const calendarItems = useMemo(() => {
    const bookingItems: CalendarItem[] = bookings.flatMap((booking) => {
      const atIso = booking.slotIso || booking.scheduledStart;
      if (!atIso) return [];
      return [
        {
          id: booking.id,
          kind: "BOOKING",
          atIso,
          title: booking.customerName,
          sub: booking.serviceNameSnapshot || booking.packageType || "Service",
          status: booking.status
        }
      ];
    });

    const blockItems: CalendarItem[] = blocks.flatMap((block) => {
      const atIso = block.startsAtIso || block.date;
      if (!atIso) return [];
      return [
        {
          id: block.id,
          kind: "BLOCK",
          atIso,
          endIso: block.endsAtIso,
          title: "Blocked",
          sub: block.reason || "Unavailable",
          status: "BLOCKED"
        }
      ];
    });

    return [...bookingItems, ...blockItems] satisfies CalendarItem[];
  }, [bookings, blocks]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of calendarItems) {
      const key = slotDateKey(item.atIso);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    for (const [, items] of map) {
      items.sort((a, b) => a.atIso.localeCompare(b.atIso));
    }
    return map;
  }, [calendarItems]);

  const weekColumns = useMemo(() => weekKeys(anchor), [anchor]);
  const monthRows = useMemo(() => monthWeekRows(anchor), [anchor]);
  const anchorMonth = useMemo(() => parseIsoDateUtc(anchor).getUTCMonth(), [anchor]);
  const dayItems = itemsByDate.get(anchor) || [];

  function renderItemChip(item: CalendarItem) {
    return (
      <div key={`${item.kind}-${item.id}`} className="block rounded-md border border-border bg-muted/50 p-2 hover:bg-muted transition-colors text-xs mb-1.5">
        <div className="flex items-center justify-between gap-2">
          <strong className="text-foreground">{slotTime(item.atIso)}</strong>
          {item.kind === "BLOCK" ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-status-pending/15 text-status-pending">BLOCK</span>
          ) : (
            <BookingStatusBadge status={item.status} />
          )}
        </div>
        <div className="font-medium text-foreground mt-0.5">{item.title}</div>
        <div className="text-muted-foreground">{item.sub}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Operations</p>
            <h1 className="font-display font-bold text-foreground text-lg">Calendar</h1>
            <p className="text-sm text-muted-foreground">View bookings and operational blocks in day, week, and month calendar grids.</p>
          </div>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit mb-3">
          {(["day", "week", "month"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === mode
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            className={inputClass}
            type="date"
            value={anchor}
            onChange={(event) => setAnchor(event.target.value)}
          />
          <a href="/admin/availability">
            <Button variant="outline" size="sm">Manage availability</Button>
          </a>
          <a href="/admin/bookings/new">
            <Button size="sm">Create booking</Button>
          </a>
        </div>
        {error ? <p className="text-sm text-destructive mt-3">{error}</p> : null}
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-foreground mb-4">{view[0].toUpperCase() + view.slice(1)} calendar</h2>

        {view === "day" ? (
          <div className="rounded-xl border border-border p-4">
            <h3 className="font-semibold text-foreground mb-3">{dateHeading(anchor)}</h3>
            {dayItems.length === 0 ? <p className="text-sm text-muted-foreground">No bookings or blocks for this day.</p> : null}
            {dayItems.map(renderItemChip)}
          </div>
        ) : null}

        {view === "week" ? (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[700px]">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-center border-b border-border">
                  {label}
                </div>
              ))}
              {weekColumns.map((dateIso) => (
                <div key={dateIso} className="border-r border-border last:border-r-0 min-h-[120px] p-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2">{dateHeading(dateIso)}</div>
                  {(itemsByDate.get(dateIso) || []).map(renderItemChip)}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {view === "month" ? (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-center border-b border-border">
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
                      <div className="text-xs font-medium text-muted-foreground mb-1">{dateHeading(dateIso)}</div>
                      {(itemsByDate.get(dateIso) || []).map(renderItemChip)}
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
