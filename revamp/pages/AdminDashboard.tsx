import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { WorkspaceShell } from "@/revamp/components/WorkspaceShell";
import { ADMIN_NAV_GROUPS } from "@/revamp/lib/navigation";
import { StatusBadge } from "@/revamp/components/StatusBadge";
import { Button } from "@/revamp/components/ui/button";
import { Plus, Wrench, UserCog, ArrowRight, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { formatDateTimeLongZA, formatTimeZA, formatZarFromCents } from "@/revamp/lib/formatters";

const QUICK_ACTIONS = [
  { href: "/admin/bookings/new", label: "Create booking", icon: Plus, description: "Capture a new booking request." },
  { href: "/admin/catalog?create=1", label: "Add service", icon: Wrench, description: "Add a new service item to the catalogue." },
  { href: "/admin/mechanics?create=1", label: "Invite mechanic", icon: UserCog, description: "Send an invite to a mechanic or operator." },
];

type AnalyticsData = {
  kpis: {
    totalBookings: number;
    totalRevenueCents: number;
    aovCents: number;
    utilizationPercent: number;
    activeMechanics: number;
  };
  jobsToday: {
    scheduled: number;
    inProgress: number;
    completed: number;
  };
  avgTurnaroundHours: number;
};

type SetupChecklistResponse = {
  setup: Array<{ key: string; title: string; href: string; complete: boolean }>;
  progressPercent: number;
};

type AuditResponse = {
  logs: Array<{
    id: string;
    actorDisplay?: string;
    action: string;
    actionLabel?: string;
    entity: string;
    createdAt: string;
  }>;
};

type BookingListItem = {
  id: string;
  ref: string;
  customerName: string;
  serviceNameSnapshot: string;
  slotIso: string;
  status: string;
  preferredMechanicId?: string;
  pricingSnapshot?: {
    totalCents?: number;
  };
};

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="stat-tile">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{hint}</span>
    </div>
  );
}

function todayIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(new Date());
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [setupProgress, setSetupProgress] = useState(0);
  const [setupItems, setSetupItems] = useState<SetupChecklistResponse["setup"]>([]);
  const [activity, setActivity] = useState<AuditResponse["logs"]>([]);
  const [todayBookings, setTodayBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadPrimary() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<AnalyticsData>(`/api/admin/analytics?period=${period}`);
        if (!ignore) setAnalytics(data);
      } catch (loadError) {
        if (!ignore) setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard metrics.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadPrimary();
    return () => {
      ignore = true;
    };
  }, [period]);

  useEffect(() => {
    let ignore = false;

    async function loadSecondary() {
      try {
        const today = todayIsoDate();
        const [setupData, auditData, bookingsData] = await Promise.all([
          apiFetch<SetupChecklistResponse>("/api/admin/setup/checklist"),
          apiFetch<AuditResponse>("/api/admin/audit"),
          apiFetch<{ bookings: BookingListItem[] }>(`/api/admin/bookings?from=${today}&to=${today}`),
        ]);
        if (ignore) return;
        setSetupItems(setupData.setup || []);
        setSetupProgress(setupData.progressPercent || 0);
        setActivity((auditData.logs || []).slice(0, 5));
        setTodayBookings((bookingsData.bookings || []).slice().sort((a, b) => a.slotIso.localeCompare(b.slotIso)));
      } catch {
        if (ignore) return;
        setSetupItems([]);
        setActivity([]);
        setTodayBookings([]);
      }
    }

    void loadSecondary();
    return () => {
      ignore = true;
    };
  }, []);

  const jobsToday = useMemo(() => {
    const base = analytics?.jobsToday || { scheduled: 0, inProgress: 0, completed: 0 };
    return {
      ...base,
      total: base.scheduled + base.inProgress + base.completed,
    };
  }, [analytics]);

  const unassigned = useMemo(() => {
    return todayBookings.find((booking) => booking.status === "CONFIRMED" && !booking.preferredMechanicId) || null;
  }, [todayBookings]);

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Overview">
      <div className="stack-lg">
        {unassigned ? (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-status-pending/10 border border-status-pending/20">
            <AlertTriangle className="w-4 h-4 text-status-pending shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {unassigned.ref} is unassigned for today.
              </p>
              <Link to={`/admin/bookings/${unassigned.id}`} className="text-sm text-primary font-semibold">Assign now →</Link>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled">{error}</p>
          </div>
        ) : null}

        <section>
          <div className="section-heading">
            <div>
              <p className="kicker">Today</p>
              <h1 className="text-xl">Workshop overview</h1>
            </div>
            <div className="flex gap-1">
              <Button
                variant={period === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod("week")}
              >
                Week
              </Button>
              <Button
                variant={period === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod("month")}
              >
                Month
              </Button>
            </div>
          </div>

          <div className="panel-padded mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-4xl font-display font-bold text-foreground">{jobsToday.total}</p>
                <p className="text-sm text-muted-foreground">Jobs on the board today</p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{jobsToday.scheduled}</p>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-status-progress">{jobsToday.inProgress}</p>
                  <p className="text-xs text-muted-foreground">In progress</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-status-completed">{jobsToday.completed}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              label="Revenue"
              value={formatZarFromCents(analytics?.kpis.totalRevenueCents)}
              hint={`AOV ${formatZarFromCents(analytics?.kpis.aovCents)}`}
            />
            <StatTile
              label="Bookings"
              value={String(analytics?.kpis.totalBookings || 0)}
              hint={period === "week" ? "Current week" : "Current month"}
            />
            <StatTile
              label="Utilization"
              value={`${analytics?.kpis.utilizationPercent || 0}%`}
              hint={`${analytics?.kpis.activeMechanics || 0} mechanics active`}
            />
            <StatTile
              label="Turnaround"
              value={`${analytics?.avgTurnaroundHours || 0}h`}
              hint="Created to completed"
            />
          </div>
          {loading ? <p className="text-sm text-muted-foreground mt-3">Refreshing metrics...</p> : null}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="panel-padded">
            <div className="section-heading">
              <div>
                <p className="kicker">Quick actions</p>
                <h2 className="text-lg">Start one task</h2>
              </div>
              <Link to="/admin/tools" className="text-sm text-primary font-semibold">All tools</Link>
            </div>
            <div className="stack-sm">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  to={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <action.icon className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>

          <div className="panel-padded">
            <div className="section-heading">
              <div>
                <p className="kicker">Recent activity</p>
                <h2 className="text-lg">Latest changes</h2>
              </div>
              <Link to="/admin/audit" className="text-sm text-primary font-semibold">View audit log</Link>
            </div>
            <div className="stack-sm">
              {activity.length === 0 ? <p className="text-sm text-muted-foreground">No recent events yet.</p> : null}
              {activity.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{(entry.actionLabel || entry.action).replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{entry.actorDisplay || "system"} · {entry.entity}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDateTimeLongZA(entry.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section>
          <div className="section-heading">
            <div>
              <p className="kicker">Today's queue</p>
              <h2 className="text-lg">Bookings</h2>
            </div>
            <Link to="/admin/bookings" className="text-sm text-primary font-semibold">View all</Link>
          </div>
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ref</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mechanic</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-sm text-muted-foreground">No bookings scheduled for today.</td>
                  </tr>
                ) : null}
                {todayBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{booking.ref}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{booking.customerName}</td>
                    <td className="px-4 py-3 text-foreground">{booking.serviceNameSnapshot}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatTimeZA(booking.slotIso)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{booking.preferredMechanicId ? "Assigned" : "Unassigned"}</td>
                    <td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="panel-padded">
          <div className="section-heading">
            <div>
              <p className="kicker">Setup assistant</p>
              <h2 className="text-lg">Operational readiness</h2>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-status-enroute/15 text-status-enroute">
              {setupProgress}% complete
            </span>
          </div>
          {setupItems.length > 0 ? (
            <div className="stack-sm">
              {setupItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <p className="text-sm text-foreground">{item.title}</p>
                  <span className={`text-xs font-semibold ${item.complete ? "text-status-completed" : "text-status-pending"}`}>
                    {item.complete ? "Complete" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-3">Setup checklist unavailable right now.</p>
          )}
          <div className="flex gap-2 mt-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/scheduling">Open setup</Link>
            </Button>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
