import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { WorkspaceShell } from "@/revamp/components/WorkspaceShell";
import { MECH_NAV_GROUPS } from "@/revamp/lib/navigation";
import { StatusBadge } from "@/revamp/components/StatusBadge";
import { MapPin, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { formatTimeZA } from "@/revamp/lib/formatters";
import { Input } from "@/revamp/components/ui/input";
import { Button } from "@/revamp/components/ui/button";

type ViewMode = "day" | "week" | "month";

type ScheduleJob = {
  id: string;
  ref: string;
  customerName?: string;
  serviceName?: string;
  slotIso: string;
  status: string;
  addressLine1: string;
};

function todayIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(new Date());
}

function toDateKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));
}

function friendlyDateLabel(dateIso: string) {
  const parsed = new Date(`${dateIso}T00:00:00Z`);
  const fullLabel = new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    timeZone: "Africa/Johannesburg",
  }).format(parsed);
  const today = todayIsoDate();
  if (dateIso === today) return { label: "Today", detail: fullLabel };
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(tomorrowDate);
  if (dateIso === tomorrow) return { label: "Tomorrow", detail: fullLabel };
  const weekday = new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    timeZone: "Africa/Johannesburg",
  }).format(parsed);
  return { label: weekday, detail: fullLabel };
}

export default function MechanicSchedule() {
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(todayIsoDate());
  const [jobs, setJobs] = useState<ScheduleJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSchedule(nextView = view, nextAnchor = anchor) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ jobCards: ScheduleJob[]; anchor?: string }>(
        `/api/mech/schedule?view=${nextView}&anchor=${nextAnchor}`
      );
      setJobs((data.jobCards || []).slice().sort((a, b) => a.slotIso.localeCompare(b.slotIso)));
      if (data.anchor) setAnchor(data.anchor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load schedule.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSchedule(view, anchor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor]);

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleJob[]>();
    for (const job of jobs) {
      const key = toDateKey(job.slotIso);
      const list = map.get(key) || [];
      list.push(job);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => ({ date, items }));
  }, [jobs]);

  const totalJobs = jobs.length;

  return (
    <WorkspaceShell navGroups={MECH_NAV_GROUPS} title="Schedule">
      <div className="stack-lg max-w-3xl">
        <div className="panel-padded stack-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-3xl font-display font-bold text-foreground">{totalJobs}</p>
              <p className="text-sm text-muted-foreground">Jobs in selected range</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant={view === "day" ? "default" : "outline"} size="sm" onClick={() => setView("day")}>Day</Button>
              <Button variant={view === "week" ? "default" : "outline"} size="sm" onClick={() => setView("week")}>Week</Button>
              <Button variant={view === "month" ? "default" : "outline"} size="sm" onClick={() => setView("month")}>Month</Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={anchor} onChange={(event) => setAnchor(event.target.value)} className="max-w-[180px]" />
            <Button size="sm" variant="outline" onClick={() => void loadSchedule(view, anchor)}>Refresh</Button>
          </div>
          {loading ? <p className="text-sm text-muted-foreground">Loading schedule...</p> : null}
          {error ? <p className="text-sm text-status-cancelled">{error}</p> : null}
        </div>

        {!loading && grouped.length === 0 ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">No assigned jobs in this range.</p>
          </div>
        ) : null}

        {grouped.map((day) => {
          const dateLabel = friendlyDateLabel(day.date);
          return (
            <div key={day.date}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{dateLabel.label}</p>
                <span className="text-xs text-muted-foreground">{dateLabel.detail}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="panel hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {day.items.map((job) => (
                      <tr key={job.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{formatTimeZA(job.slotIso)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{job.serviceName || "Service"}</p>
                          <p className="text-xs text-muted-foreground">{job.ref}</p>
                        </td>
                        <td className="px-4 py-3 text-foreground">{job.customerName || "Customer"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{job.addressLine1}</td>
                        <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                        <td className="px-2 py-3">
                          <Link to={`/mech/job/${job.id}`}>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="stack-sm md:hidden">
                {day.items.map((job) => (
                  <Link
                    key={job.id}
                    to={`/mech/job/${job.id}`}
                    className="panel-padded flex items-center gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-12 text-center shrink-0">
                      <p className="text-sm font-bold text-foreground font-mono">{formatTimeZA(job.slotIso)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{job.serviceName || "Service"}</p>
                      <p className="text-xs text-muted-foreground truncate">{job.customerName || "Customer"} · {job.ref}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" />{job.addressLine1}
                      </div>
                    </div>
                    <StatusBadge status={job.status} />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </WorkspaceShell>
  );
}
