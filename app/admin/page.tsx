"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ActionModal from "@/app/components/ActionModal";
import { StatusBadge, type BookingStatus } from "@/app/components/StatusBadge";
import OnboardingChecklist from "./components/OnboardingChecklist";
import { ADMIN_HOME_QUICK_ACTIONS } from "./admin-nav";
import { formatDateTimeZA } from "@/lib/format/date";
import { AlertTriangle, Plus, Wrench, UserCog, ArrowRight } from "lucide-react";

type KPIs = {
  totalBookings: number;
  totalRevenueCents: number;
  aovCents: number;
  utilizationPercent: number;
  onTimePercent: number;
  avgRating: number;
  ratingCount: number;
  activeMechanics: number;
};

type AnalyticsData = {
  period: string;
  kpis: KPIs;
  jobsToday: {
    scheduled: number;
    inProgress: number;
    completed: number;
  };
  avgTurnaroundHours: number;
  mostCommonServices: Array<{ serviceName: string; count: number }>;
  mechanicWorkloads: Array<{ mechanicId: string; mechanicName: string; jobCount: number }>;
};

type SetupItem = {
  key: string;
  title: string;
  href: string;
  complete: boolean;
};

type AuditLog = {
  id: string;
  actor?: string | null;
  actorDisplay?: string;
  action: string;
  actionLabel?: string;
  entity: string;
  createdAt: string;
};

type BookingListItem = {
  id: string;
  ref: string;
  customerName: string;
  customerPhone: string;
  serviceNameSnapshot: string;
  slotIso: string;
  status: string;
  preferredMechanicId?: string;
};

const QUICK_ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/admin/bookings/new": Plus,
  "/admin/catalog?create=1": Wrench,
  "/admin/mechanics?create=1": UserCog,
};

function formatZar(cents: number) {
  return `R ${(cents / 100).toLocaleString("en-ZA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}

function formatTimeZA(value: string | Date | null | undefined) {
  if (!value) return "\u2014";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "\u2014";
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatAuditLabel(log: AuditLog) {
  return log.actionLabel || `${log.action.replace(/_/g, " ")} \u00b7 ${log.entity}`;
}

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="stat-tile">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <strong className="text-2xl font-display font-bold text-foreground">{value}</strong>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [setupItems, setSetupItems] = useState<SetupItem[]>([]);
  const [setupProgress, setSetupProgress] = useState<number>(0);
  const [setupGuideOpen, setSetupGuideOpen] = useState(false);
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [todayBookings, setTodayBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklistData, setChecklistData] = useState<{
    completedItems: string[];
    shopSlug: string;
    hasCatalogEdits: boolean;
    hasCustomHours: boolean;
    hasLogo: boolean;
    hasMechanic: boolean;
    hasBooking: boolean;
    widgetInstalled: boolean;
  } | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/analytics?period=${period}`);
        if (!res.ok) {
          setError("We couldn't load your dashboard data. The server returned an error — try refreshing the page.");
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Connection failed. Check your internet connection and try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadAnalytics();
  }, [period]);

  useEffect(() => {
    async function loadSecondaryPanels() {
      try {
        const todayIso = new Date().toISOString().slice(0, 10);
        const [setupRes, auditRes, bookingsRes, onboardingRes] = await Promise.all([
          fetch("/api/admin/setup/checklist"),
          fetch("/api/admin/audit"),
          fetch(`/api/admin/bookings?from=${todayIso}&to=${todayIso}`),
          fetch("/api/admin/onboarding/status")
        ]);

        const setupRaw = await setupRes.json().catch(() => ({}));
        const setupPayload = setupRaw.data ?? setupRaw;
        if (setupRes.ok) {
          setSetupItems(setupPayload.setup || []);
          setSetupProgress(setupPayload.progressPercent || 0);
        }

        const auditRaw = await auditRes.json().catch(() => ({}));
        const auditPayload = auditRaw.data ?? auditRaw;
        if (auditRes.ok) {
          setActivity((auditPayload.logs || []).slice(0, 5));
        }

        const bookingsPayload = await bookingsRes.json().catch(() => ({}));
        if (bookingsRes.ok) {
          const sorted = (bookingsPayload.bookings || []).sort(
            (a: BookingListItem, b: BookingListItem) => a.slotIso.localeCompare(b.slotIso)
          );
          setTodayBookings(sorted);
        }

        const onboardingPayload = await onboardingRes.json().catch(() => ({}));
        if (onboardingRes.ok && onboardingPayload) {
          setChecklistData(onboardingPayload);
        }
      } catch {
        // Non-blocking secondary panels.
      }
    }

    void loadSecondaryPanels();
  }, []);

  const jobsToday = useMemo(() => {
    if (!data?.jobsToday) return { scheduled: 0, inProgress: 0, completed: 0, total: 0 };
    const total = data.jobsToday.scheduled + data.jobsToday.inProgress + data.jobsToday.completed;
    return { ...data.jobsToday, total };
  }, [data]);

  const unassignedBookings = useMemo(
    () => todayBookings.filter((b) => b.status === "CONFIRMED" && !b.preferredMechanicId),
    [todayBookings]
  );

  return (
    <div className="space-y-6">
      {/* Unassigned booking alert banner */}
      {unassignedBookings.length > 0 && (
        <div className="space-y-2">
          {unassignedBookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/admin/bookings/${booking.id}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors"
            >
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
              <span className="text-sm font-medium text-foreground flex-1">
                <strong>{booking.ref}</strong> is unassigned for today. Assign now <ArrowRight className="inline h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Onboarding checklist */}
      {checklistData && (
        <OnboardingChecklist
          completedItems={checklistData.completedItems}
          shopSlug={checklistData.shopSlug}
          hasCatalogEdits={checklistData.hasCatalogEdits}
          hasCustomHours={checklistData.hasCustomHours}
          hasLogo={checklistData.hasLogo}
          hasMechanic={checklistData.hasMechanic}
          hasBooking={checklistData.hasBooking}
          widgetInstalled={checklistData.widgetInstalled}
        />
      )}

      {/* Top row: Overview */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Today</p>
            <CardTitle className="text-xl font-display">Workshop overview</CardTitle>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={period === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod("week")}
            >
              Week
            </Button>
            <Button
              variant={period === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod("month")}
            >
              Month
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="font-semibold text-foreground text-sm mb-1">Dashboard unavailable</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-2">
                If this keeps happening, contact{" "}
                <a href="mailto:support@cycledesk.co.za" className="text-primary hover:underline">support@cycledesk.co.za</a>
              </p>
            </div>
          ) : (
            <>
              {/* Hero metric + breakdown */}
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <strong className="text-4xl font-display font-bold text-foreground">{jobsToday.total}</strong>
                  <p className="text-xs text-muted-foreground mt-1">Jobs today</p>
                </div>
                <div className="flex-1 w-full grid grid-cols-3 gap-4 sm:border-l border-t sm:border-t-0 border-border sm:pl-6 pt-4 sm:pt-0">
                  <div className="text-center">
                    <strong className="text-lg font-bold">{jobsToday.scheduled}</strong>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                  </div>
                  <div className="text-center">
                    <strong className="text-lg font-bold text-status-progress">{jobsToday.inProgress}</strong>
                    <p className="text-xs text-muted-foreground">In progress</p>
                  </div>
                  <div className="text-center">
                    <strong className="text-lg font-bold text-status-completed">{jobsToday.completed}</strong>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </div>

              {/* KPI tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatTile
                  label="Revenue"
                  value={data ? formatZar(data.kpis.totalRevenueCents) : "\u2014"}
                  hint={data ? `AOV ${formatZar(data.kpis.aovCents)}` : "Awaiting data"}
                />
                <StatTile
                  label="Bookings"
                  value={data ? String(data.kpis.totalBookings) : "\u2014"}
                  hint={period === "week" ? "Current week" : "Current month"}
                />
                <StatTile
                  label="Utilization"
                  value={data ? `${data.kpis.utilizationPercent}%` : "\u2014"}
                  hint={data ? `${data.kpis.activeMechanics} mechanics active` : "Awaiting data"}
                />
                <StatTile
                  label="Turnaround"
                  value={data && data.avgTurnaroundHours > 0 ? `${data.avgTurnaroundHours}h` : "\u2014"}
                  hint="Created to completed"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions + Recent Activity — 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Quick actions</p>
              <CardTitle className="text-lg font-display">Start one task</CardTitle>
            </div>
            <Link href="/admin/tools" className="text-sm text-primary hover:underline">
              All tools
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {ADMIN_HOME_QUICK_ACTIONS.map((action) => {
              const IconComponent = QUICK_ACTION_ICONS[action.href];
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  {IconComponent && (
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted shrink-0">
                      <IconComponent className="h-4 w-4 text-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <strong className="text-sm font-semibold text-foreground">{action.label}</strong>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Recent activity</p>
              <CardTitle className="text-lg font-display">Latest changes</CardTitle>
            </div>
            <Link href="/admin/audit" className="text-sm text-primary hover:underline">
              View audit log
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent events yet.</p>
            ) : null}
            {activity.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-0.5 pb-3 border-b border-border last:border-0 last:pb-0">
                <strong className="text-sm font-medium text-foreground">{formatAuditLabel(entry)}</strong>
                <span className="text-xs text-muted-foreground">
                  {entry.actorDisplay || entry.actor || "system"} &middot; {formatDateTimeZA(entry.createdAt)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Today's queue — bookings table */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Today&apos;s queue</p>
            <CardTitle className="text-lg font-display">Scheduled bookings</CardTitle>
          </div>
          <Link href="/admin/bookings" className="text-sm text-primary hover:underline">
            All bookings
          </Link>
        </CardHeader>
        <CardContent>
          {todayBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings scheduled for today.</p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ref</th>
                    <th className="px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Service</th>
                    <th className="px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                    <th className="px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Mechanic</th>
                    <th className="px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayBookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3">
                        <Link href={`/admin/bookings/${booking.id}`} className="font-medium text-primary hover:underline">
                          {booking.ref}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-foreground">{booking.customerName}</td>
                      <td className="px-6 py-3 text-muted-foreground hidden sm:table-cell">{booking.serviceNameSnapshot}</td>
                      <td className="px-6 py-3 text-foreground tabular-nums">{formatTimeZA(booking.slotIso)}</td>
                      <td className="px-6 py-3 hidden md:table-cell">
                        {booking.preferredMechanicId ? (
                          <Badge variant="secondary">Assigned</Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">Unassigned</Badge>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={booking.status.toLowerCase() as BookingStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom row: Setup */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Setup assistant</p>
            <CardTitle className="text-lg font-display">Operational readiness</CardTitle>
          </div>
          <Badge variant="secondary">{setupProgress}% complete</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            KPI overview stays primary. Use the checklist only when you are ready to finish setup.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setSetupGuideOpen(true)} disabled={setupItems.length === 0}>
              View checklist
            </Button>
            <Link href="/admin/setup" className="text-sm text-primary hover:underline">
              Open setup
            </Link>
          </div>
        </CardContent>
      </Card>

      <ActionModal
        open={setupGuideOpen}
        title="First-run setup guide"
        description="Use this checklist as in-app guidance. KPI overview remains the default landing view."
        onClose={() => setSetupGuideOpen(false)}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm">Progress</span>
            <strong className="text-sm">{setupProgress}% complete</strong>
          </div>
          {setupItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <strong className="text-sm font-medium">{item.title}</strong>
              <div className="flex items-center gap-2">
                <Badge variant={item.complete ? "default" : "secondary"}>
                  {item.complete ? "Complete" : "Pending"}
                </Badge>
                <Link href={item.href}>
                  <Button variant="outline" size="sm">Open</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </ActionModal>
    </div>
  );
}
