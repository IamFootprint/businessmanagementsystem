"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type BookingStatus } from "@/app/components/StatusBadge";
import { formatDateTimeZA } from "@/lib/format/date";
import { MapPin, Clock, Navigation, Phone } from "lucide-react";

type JobCard = {
  id: string;
  ref: string;
  serviceName?: string;
  addressLine1: string;
  slotIso: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
};

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Johannesburg"
  }).format(new Date());
}

function normalizeStatus(status: string): BookingStatus {
  return status.toLowerCase().replace(/_/g, "_") as BookingStatus;
}

function isActiveStatus(status: string) {
  return ["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_APPROVAL"].includes(status);
}

export default function MechTodayPage() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [inProgressJobCards, setInProgressJobCards] = useState<JobCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadJobs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mech/today?date=${todayIso()}`);
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && String(data?.error || "").toLowerCase().includes("complete profile")) {
        window.location.href = "/mech/profile";
        return;
      }
      if (res.status === 401 || res.status === 403) {
        setError(res.status === 401 ? "Please login to view your schedule." : "Complete your profile to continue.");
        setJobCards([]);
        return;
      }
      setJobCards((data.jobCards || []).slice().sort((a: JobCard, b: JobCard) => a.slotIso.localeCompare(b.slotIso)));
      setInProgressJobCards(data.inProgressJobCards || []);
    } catch {
      setError("We couldn't load your job cards. Check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  const activeJob = useMemo(() => {
    if (inProgressJobCards.length > 0) return inProgressJobCards[0];
    return jobCards.find((job) => isActiveStatus(job.status)) || null;
  }, [inProgressJobCards, jobCards]);

  const upcomingJobs = useMemo(() => {
    return jobCards.filter((job) => job.id !== activeJob?.id);
  }, [jobCards, activeJob]);

  const doneCount = jobCards.filter((job) => job.status === "COMPLETED").length;
  const activeCount = jobCards.filter((job) => isActiveStatus(job.status)).length;
  const upcomingCount = jobCards.filter((job) => ["SCHEDULED"].includes(job.status)).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero section with job summary stats */}
      <section className="relative rounded-xl bg-primary p-6 text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-3xl font-display font-bold text-primary-foreground">{jobCards.length}</p>
              <p className="text-sm text-primary-foreground/80">Jobs assigned today</p>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-green-300">{doneCount}</p>
                <p className="text-xs text-primary-foreground/70">Done</p>
              </div>
              <div>
                <p className="text-lg font-bold text-yellow-300">{activeCount}</p>
                <p className="text-xs text-primary-foreground/70">Active</p>
              </div>
              <div>
                <p className="text-lg font-bold text-primary-foreground/60">{upcomingCount}</p>
                <p className="text-xs text-primary-foreground/70">Upcoming</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <a href="/mech/schedule">
              <Button variant="outline" className="w-full sm:w-auto border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                Open calendar
              </Button>
            </a>
            <a href="/mech/bookings/new">
              <Button className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">Add booking</Button>
            </a>
          </div>
        </div>
      </section>

      {/* Loading state */}
      {loading ? (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <Skeleton className="h-5 w-2/5 mb-2" />
                <Skeleton className="h-4 w-3/5 mb-1.5" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Error state */}
      {error ? (
        <div className="bg-card rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="font-semibold text-foreground text-sm mb-1">Could not load your schedule</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          {error.includes("login") ? (
            <Button className="mt-3" onClick={() => (window.location.href = "/login")}>Go to login</Button>
          ) : (
            <div>
              <Button variant="outline" className="mt-3" onClick={loadJobs}>Try again</Button>
              <p className="text-[11px] text-muted-foreground/70 mt-3">
                Still not working?{" "}
                <a href="mailto:support@cycledesk.co.za" className="text-primary hover:underline">Contact support</a>
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* Current Job highlighted card */}
      {!loading && !error && activeJob ? (
        <div className="bg-card rounded-xl border-2 border-primary p-5">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Current Job</p>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-bold text-foreground text-lg">{activeJob.serviceName || "Service"}</p>
              <p className="text-sm text-muted-foreground">{activeJob.customerName || "Customer"} &middot; {activeJob.ref}</p>
            </div>
            <StatusBadge status={normalizeStatus(activeJob.status)} />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Clock className="w-4 h-4" />
            <span>{formatDateTimeZA(activeJob.slotIso)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <MapPin className="w-4 h-4" />
            <span>{activeJob.addressLine1 || "Address unavailable"}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => (window.location.href = `/mech/job/${activeJob.id}`)}>
              <Navigation className="w-4 h-4 mr-1" /> Navigate
            </Button>
            {activeJob.customerPhone ? (
              <a href={`tel:${activeJob.customerPhone}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <Phone className="w-4 h-4 mr-1" /> Call
                </Button>
              </a>
            ) : (
              <Button variant="outline" size="sm" className="flex-1" disabled>
                <Phone className="w-4 h-4 mr-1" /> Call
              </Button>
            )}
          </div>
          <div className="mt-3">
            <Button size="lg" className="w-full" onClick={() => (window.location.href = `/mech/job/${activeJob.id}`)}>
              Update Status
            </Button>
          </div>
        </div>
      ) : !loading && !error && inProgressJobCards.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">No active jobs right now.</p>
        </div>
      ) : null}

      {/* Upcoming jobs as clickable cards */}
      {!loading && !error ? (
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</p>
          <div className="flex flex-col gap-3">
            {upcomingJobs.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-sm text-muted-foreground">No additional jobs scheduled today.</p>
              </div>
            ) : null}
            {upcomingJobs.map((job) => (
              <a
                key={job.id}
                href={`/mech/job/${job.id}`}
                className="bg-card rounded-xl border border-border p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer no-underline"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground truncate">{job.serviceName || "Service"}</p>
                    <span className="text-xs font-bold text-muted-foreground shrink-0">{formatDateTimeZA(job.slotIso)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{job.customerName || "Customer"} &middot; {job.addressLine1}</p>
                </div>
                <StatusBadge status={normalizeStatus(job.status)} />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {/* Empty state when no jobs at all */}
      {!loading && !error && jobCards.length === 0 && inProgressJobCards.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-foreground">No jobs scheduled for today.</p>
          <p className="text-sm text-muted-foreground mt-2">New bookings will appear here once assigned to you.</p>
        </div>
      ) : null}
    </div>
  );
}
