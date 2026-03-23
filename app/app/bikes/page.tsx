"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import ActionModal from "@/app/components/ActionModal";
type Bike = {
  id: string;
  bikeType: "MTB" | "ROAD" | "GRAVEL" | "E_BIKE" | "OTHER";
  brand: string;
  model?: string;
  drivetrainType?: string;
  brakeType?: string;
  eBike: boolean;
  notes?: string;
};

const emptyBike: Omit<Bike, "id"> = {
  bikeType: "MTB",
  brand: "",
  model: "",
  drivetrainType: "",
  brakeType: "",
  eBike: false,
  notes: ""
};

const selectClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export default function BikesPage() {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [form, setForm] = useState(emptyBike);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/app/bikes");
      const data = await res.json();
      setBikes(data.bikes || []);
    } catch {
      setError("Failed to load bikes.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addBike() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/app/bikes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        setError("Unable to save bike.");
        return false;
      }
      setForm(emptyBike);
      await load();
      return true;
    } catch {
      setError("Unable to save bike.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function removeBike(id: string) {
    const res = await fetch(`/api/app/bikes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Unable to remove bike.");
      return;
    }
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border border-border p-5">
        <h1 className="font-display font-bold text-foreground text-lg">My Bikes</h1>
        <p className="text-sm text-muted-foreground">Add your bike details once so future bookings are faster and more accurate.</p>
        {error ? <p className="text-sm text-destructive mt-2">{error}</p> : null}
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-foreground">Bike list</h2>
          <Button onClick={() => setCreateOpen(true)}>Add bike</Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Use Add bike to open a focused capture form.</p>

        <div className="flex flex-col gap-3">
          {bikes.length === 0 ? <p className="text-sm text-muted-foreground">No bikes saved yet.</p> : null}
          {bikes.map((bike) => (
            <div key={bike.id} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <strong className="text-sm">{bike.brand} {bike.model || ""}</strong>
                <div className="text-sm text-muted-foreground">{bike.bikeType}{bike.eBike ? " \u2022 E-bike" : ""}</div>
                {bike.drivetrainType ? <div className="text-xs text-muted-foreground">Drivetrain: {bike.drivetrainType}</div> : null}
                {bike.brakeType ? <div className="text-xs text-muted-foreground">Brakes: {bike.brakeType}</div> : null}
              </div>
              <Button variant="outline" size="sm" onClick={() => removeBike(bike.id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      <ActionModal
        open={createOpen}
        title="Add bike"
        description="Capture bike details and save."
        onClose={() => {
          if (saving) return;
          setCreateOpen(false);
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Bike type</label>
            <select
              className={selectClass}
              value={form.bikeType}
              onChange={(e) => setForm((prev) => ({ ...prev, bikeType: e.target.value as Bike["bikeType"] }))}
            >
              <option value="MTB">MTB</option>
              <option value="ROAD">Road</option>
              <option value="GRAVEL">Gravel</option>
              <option value="E_BIKE">E-bike</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <LabeledInput label="Brand" value={form.brand} onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))} />
          <LabeledInput label="Model" value={form.model || ""} onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))} />
          <LabeledInput
            label="Drivetrain"
            value={form.drivetrainType || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, drivetrainType: e.target.value }))}
          />
          <LabeledInput
            label="Brake type"
            value={form.brakeType || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, brakeType: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={form.eBike}
              onChange={(e) => setForm((prev) => ({ ...prev, eBike: e.target.checked }))}
            />
            E-bike
          </label>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <textarea
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y"
              value={form.notes || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Exit
            </Button>
            <Button
              onClick={async () => {
                const ok = await addBike();
                if (ok) setCreateOpen(false);
              }}
              disabled={!form.brand.trim() || saving}
            >
              {saving ? "Saving..." : "Save bike"}
            </Button>
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
