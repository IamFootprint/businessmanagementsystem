import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkspaceShell } from "@/revamp/components/WorkspaceShell";
import { MECH_NAV_GROUPS } from "@/revamp/lib/navigation";
import { Button } from "@/revamp/components/ui/button";
import { Phone, Mail, MapPin, Star, Wrench, LogOut, Calendar } from "lucide-react";
import { apiFetch } from "@/lib/client/api";

type MechanicProfileRecord = {
  name?: string | null;
  phone: string;
  specialties?: string[];
};

type JobCard = {
  id: string;
  status: string;
};

function initials(name?: string | null) {
  if (!name) return "ME";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function MechanicProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MechanicProfileRecord | null>(null);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [profileData, todayData] = await Promise.all([
          apiFetch<{ profile: MechanicProfileRecord }>("/api/mech/profile"),
          apiFetch<{ jobCards: JobCard[] }>("/api/mech/today"),
        ]);
        if (ignore) return;
        setProfile(profileData.profile || null);
        setJobCards(todayData.jobCards || []);
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load mechanic profile.");
          setProfile(null);
          setJobCards([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const completedCount = useMemo(() => jobCards.filter((job) => job.status === "COMPLETED").length, [jobCards]);
  const activeCount = useMemo(
    () => jobCards.filter((job) => ["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_APPROVAL"].includes(job.status)).length,
    [jobCards]
  );
  const avatar = useMemo(() => initials(profile?.name), [profile?.name]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "MANUAL" }),
        credentials: "include",
      });
    } finally {
      setSigningOut(false);
      navigate("/login");
    }
  }

  return (
    <WorkspaceShell navGroups={MECH_NAV_GROUPS} title="Profile">
      <div className="stack-lg max-w-2xl">
        {loading ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">Loading profile...</p>
          </div>
        ) : null}
        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled">{error}</p>
          </div>
        ) : null}

        <div className="panel-padded flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-display font-bold text-xl">{avatar}</span>
          </div>
          <div>
            <p className="font-bold text-foreground text-xl">{profile?.name || "Mechanic"}</p>
            <p className="text-sm text-muted-foreground">CycleDesk mechanic</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 text-accent fill-accent" />
              <span className="text-sm font-semibold text-foreground">4.9</span>
              <span className="text-xs text-muted-foreground">({completedCount} completed)</span>
            </div>
          </div>
        </div>

        <div className="panel divide-y divide-border">
          {[
            { icon: Phone, label: "Phone", value: profile?.phone || "—" },
            { icon: Mail, label: "Email", value: "support@cycledesk.co.za" },
            { icon: MapPin, label: "Service Area", value: "Johannesburg" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-4">
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Wrench, label: "Today", value: String(jobCards.length) },
            { icon: Calendar, label: "Active", value: String(activeCount) },
            { icon: Star, label: "Completed", value: String(completedCount) },
          ].map((stat) => (
            <div key={stat.label} className="panel-padded text-center">
              <stat.icon className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="panel-padded">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Specialisations</p>
          <div className="flex flex-wrap gap-2">
            {(profile?.specialties || ["Road Bikes", "Mountain Bikes"]).map((skill) => (
              <span key={skill} className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <Button variant="outline" className="w-full text-destructive" onClick={() => void signOut()} disabled={signingOut}>
          <LogOut className="w-4 h-4" /> {signingOut ? "Signing Out..." : "Sign Out"}
        </Button>
      </div>
    </WorkspaceShell>
  );
}
