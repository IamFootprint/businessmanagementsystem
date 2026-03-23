import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { WorkspaceShell } from "@/revamp/components/WorkspaceShell";
import { MECH_NAV_GROUPS } from "@/revamp/lib/navigation";
import { StatusBadge } from "@/revamp/components/StatusBadge";
import { Button } from "@/revamp/components/ui/button";
import { MapPin, Clock, Navigation, Phone } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { formatTimeZA } from "@/revamp/lib/formatters";

type JobCard = {
  id: string;
  ref: string;
  serviceName?: string;
  slotIso: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  addressLine1: string;
};

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(new Date());
}

function isActiveStatus(status: string) {
  return ["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_APPROVAL"].includes(status);
}

export default function MechanicToday() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [inProgressJobCards, setInProgressJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadJobs() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ jobCards: JobCard[]; inProgressJobCards: JobCard[] }>(`/api/mech/today?date=${todayIso()}`);
      setJobCards((data.jobCards || []).slice().sort((a, b) => a.slotIso.localeCompare(b.slotIso)));
      setInProgressJobCards((data.inProgressJobCards || []).slice());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load today's jobs.");
      setJobCards([]);
      setInProgressJobCards([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadJobs();
  }, []);

  const activeJob = useMemo(() => {
    if (inProgressJobCards.length > 0) return inProgressJobCards[0];
    return jobCards.find((job) => isActiveStatus(job.status)) || null;
  }, [inProgressJobCards, jobCards]);

  const upcomingJobs = useMemo(() => {
    return jobCards.filter((job) => job.id !== activeJob?.id);
  }, [jobCards, activeJob]);

  return (
    <WorkspaceShell navGroups={MECH_NAV_GROUPS} title="Today's Jobs">
      <div className="stack-lg max-w-3xl">
        <div className="panel-padded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-display font-bold text-foreground">{jobCards.length}</p>
              <p className="text-sm text-muted-foreground">Jobs assigned today</p>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-status-completed">{jobCards.filter((job) => job.status === "COMPLETED").length}</p>
                <p className="text-xs text-muted-foreground">Done</p>
              </div>
              <div>
                <p className="text-lg font-bold text-status-progress">{jobCards.filter((job) => isActiveStatus(job.status)).length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-lg font-bold text-muted-foreground">{jobCards.filter((job) => ["SCHEDULED"].includes(job.status)).length}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">Loading jobs...</p>
          </div>
        ) : null}
        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled mb-3">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void loadJobs()}>Retry</Button>
          </div>
        ) : null}

        {activeJob ? (
          <div className="panel-padded border-2 border-primary">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Current Job</p>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-bold text-foreground text-lg">{activeJob.serviceName || "Service"}</p>
                <p className="text-sm text-muted-foreground">{activeJob.customerName || "Customer"} · {activeJob.ref}</p>
              </div>
              <StatusBadge status={activeJob.status} />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span>{formatTimeZA(activeJob.slotIso)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <MapPin className="w-4 h-4" />
              <span>{activeJob.addressLine1 || "Address unavailable"}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1"><Navigation className="w-4 h-4" /> Navigate</Button>
              <Button variant="outline" size="sm" className="flex-1"><Phone className="w-4 h-4" /> Call</Button>
            </div>
            <div className="mt-3">
              <Button variant="default" size="lg" className="w-full" asChild>
                <Link to={`/mech/job/${activeJob.id}`}>Update Status</Link>
              </Button>
            </div>
          </div>
        ) : !loading && !error ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">No active jobs right now.</p>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</p>
          <div className="stack-sm">
            {upcomingJobs.length === 0 && !loading ? (
              <div className="panel-padded">
                <p className="text-sm text-muted-foreground">No additional jobs scheduled today.</p>
              </div>
            ) : null}
            {upcomingJobs.map((job) => (
              <Link
                key={job.id}
                to={`/mech/job/${job.id}`}
                className="panel-padded flex items-center gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground truncate">{job.serviceName || "Service"}</p>
                    <span className="text-xs font-bold text-muted-foreground shrink-0">{formatTimeZA(job.slotIso)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{job.customerName || "Customer"} · {job.addressLine1}</p>
                </div>
                <StatusBadge status={job.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
