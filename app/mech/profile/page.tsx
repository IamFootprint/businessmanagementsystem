"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
type WeeklyHour = {
  day: string;
  start: string;
  end: string;
  active: boolean;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_WEEKLY_HOURS: WeeklyHour[] = DAYS.map((day) => ({
  day,
  start: "08:00",
  end: "17:00",
  active: day !== "Sun"
}));

export default function MechanicProfilePage() {
  const [name, setName] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [blackoutDates, setBlackoutDates] = useState("");
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHour[]>(DEFAULT_WEEKLY_HOURS);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadProfile() {
    setError(null);
    try {
      const res = await fetch("/api/mech/profile");
      const raw = await res.json();
      if (!res.ok) {
        setError(raw?.error || "Failed to load profile.");
        return;
      }
      const data = raw.data ?? raw;
      const profile = data.profile || {};
      setName(profile.name || "");
      setSpecialties((profile.specialties || []).join(", "));
      const availability = profile.availability || {};
      setBlackoutDates((availability.blackoutDates || []).join(", "));
      setWeeklyHours(
        Array.isArray(availability.weeklyHours) && availability.weeklyHours.length
          ? availability.weeklyHours
          : DEFAULT_WEEKLY_HOURS
      );
    } catch {
      setError("Failed to load profile.");
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function updateHour(index: number, patch: Partial<WeeklyHour>) {
    setWeeklyHours((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry)));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        name,
        specialties: specialties
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        availability: {
          weeklyHours,
          blackoutDates: blackoutDates
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
        }
      };
      const res = await fetch("/api/mech/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to save profile.");
        return;
      }
      setMessage("Profile and availability saved.");
    } catch {
      setError("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  const timeInputClass = "h-9 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50";

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h2 className="font-display font-bold text-foreground text-lg">Mechanic profile & availability</h2>
      <p className="text-sm text-muted-foreground mb-4">Set your specialties, weekly hours, and blackout dates.</p>

      <div className="flex flex-col gap-4">
        <LabeledInput label="Display name" value={name} onChange={(event) => setName(event.target.value)} />
        <LabeledInput
          label="Specialties"
          helperText="Comma-separated (e.g. e-bike, race prep, suspension)"
          value={specialties}
          onChange={(event) => setSpecialties(event.target.value)}
        />

        <div className="rounded-lg border border-border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3">Weekly hours</h3>
          <div className="flex flex-col gap-2">
            {weeklyHours.map((entry, index) => (
              <div key={entry.day} className="flex items-center gap-3">
                <label className="flex items-center gap-2 min-w-[80px] text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={entry.active}
                    onChange={(event) => updateHour(index, { active: event.target.checked })}
                  />
                  {entry.day}
                </label>
                <input
                  className={timeInputClass}
                  type="time"
                  value={entry.start}
                  onChange={(event) => updateHour(index, { start: event.target.value })}
                  disabled={!entry.active}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  className={timeInputClass}
                  type="time"
                  value={entry.end}
                  onChange={(event) => updateHour(index, { end: event.target.value })}
                  disabled={!entry.active}
                />
              </div>
            ))}
          </div>
        </div>

        <LabeledInput
          label="Blackout dates"
          helperText="Comma-separated dates (YYYY-MM-DD)"
          value={blackoutDates}
          onChange={(event) => setBlackoutDates(event.target.value)}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        <Button disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </div>
  );
}
