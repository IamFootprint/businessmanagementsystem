"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { formatDateTimeZA } from "@/lib/format/date";
type Policy = {
  defaultNoticeHours: number;
  assignmentMode: "AUTO" | "MANUAL";
};

type UnassignedJobCard = {
  id: string;
  ref: string;
  bookingRef: string;
  customerName: string;
  serviceName: string;
  slotIso: string;
};

export default function SchedulingPage() {
  const [policy, setPolicy] = useState<Policy>({ defaultNoticeHours: 24, assignmentMode: "AUTO" });
  const [unassigned, setUnassigned] = useState<UnassignedJobCard[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setError(null);
    try {
      const [policyRes, jobsRes] = await Promise.all([
        fetch("/api/admin/scheduling/policy"),
        fetch("/api/admin/job-cards/unassigned")
      ]);
      const policyRaw = await policyRes.json().catch(() => ({}));
      const jobsData = await jobsRes.json().catch(() => ({}));
      const policyData = policyRaw.data ?? policyRaw;
      if (policyRes.ok && policyData.policy) {
        setPolicy(policyData.policy);
      }
      if (jobsRes.ok) {
        setUnassigned(jobsData.jobCards || []);
      }
      if (!policyRes.ok || !jobsRes.ok) {
        setError("Unable to load scheduling configuration.");
      }
    } catch {
      setError("Unable to load scheduling configuration.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/scheduling/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy)
      });
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(raw?.error || "Failed to save scheduling policy.");
        return;
      }
      const data = raw.data ?? raw;
      setPolicy(data.policy || policy);
      setMessage("Scheduling policy saved.");
    } catch {
      setError("Failed to save scheduling policy.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h1>Scheduling policy</h1>
      <p>Control notice windows and assignment behavior for new bookings.</p>

      <LabeledInput
        label="Default notice hours"
        type="number"
        min={0}
        value={String(policy.defaultNoticeHours)}
        onChange={(event) =>
          setPolicy((prev) => ({
            ...prev,
            defaultNoticeHours: Number(event.target.value || 0)
          }))
        }
      />

      <label className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">Assignment mode</span>
        <select
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={policy.assignmentMode}
          onChange={(event) =>
            setPolicy((prev) => ({
              ...prev,
              assignmentMode: event.target.value === "MANUAL" ? "MANUAL" : "AUTO"
            }))
          }
        >
          <option value="AUTO">AUTO</option>
          <option value="MANUAL">MANUAL</option>
        </select>
      </label>

      {error ? <p className="text-sm text-destructive mt-3">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground mt-3">{message}</p> : null}
      <Button className="mt-3" disabled={saving} onClick={save}>
        {saving ? "Saving..." : "Save policy"}
      </Button>

      <div className="mt-6">
        <h2>Unassigned jobs</h2>
        {unassigned.length === 0 ? <p className="text-sm text-muted-foreground">No unassigned jobs.</p> : null}
        {unassigned.length > 0 ? (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Job card</th>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Slot</th>
                </tr>
              </thead>
              <tbody>
                {unassigned.map((job) => (
                  <tr key={job.id}>
                    <td>{job.ref}</td>
                    <td>{job.bookingRef}</td>
                    <td>{job.customerName}</td>
                    <td>{job.serviceName}</td>
                    <td>{formatDateTimeZA(job.slotIso)}</td>
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
