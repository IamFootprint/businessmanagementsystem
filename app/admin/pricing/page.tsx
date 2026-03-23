"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LabeledInput } from "@/components/ui/labeled-input";
import { useAdminUi } from "../admin-ui";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import ActionModal from "@/app/components/ActionModal";
import RecordActionButton from "@/app/components/RecordActionButton";
import { Save } from "lucide-react";
type PricingRule = {
  calloutFeeCents: number;
  platformFeeCents: number;
  platformFeePercentBps?: number | null;
  partsMarkupBps: number;
  travelBandRulesJson: unknown;
  afterHoursEnabled: boolean;
  afterHoursSurchargeBps: number;
  effectiveFrom: string;
  isActive: boolean;
};

type TravelBand = {
  minKm: number;
  maxKm: number;
  feeCents: number;
  label: string;
};

function toZar(value: number) {
  return (value / 100).toFixed(0);
}

function parseTravelBands(raw: unknown): TravelBand[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b) => ({
    minKm: Number(b?.minKm ?? 0),
    maxKm: Number(b?.maxKm ?? 0),
    feeCents: Number(b?.feeCents ?? 0),
    label: String(b?.label ?? "")
  }));
}

function validateBands(bands: TravelBand[]): string | null {
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    if (b.minKm < 0 || b.maxKm < 0 || b.feeCents < 0) return `Band ${i + 1}: values must be non-negative.`;
    if (b.maxKm <= b.minKm) return `Band ${i + 1}: max km must be greater than min km.`;
    if (!b.label.trim()) return `Band ${i + 1}: label is required.`;
  }
  const sorted = [...bands].sort((a, b) => a.minKm - b.minKm);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].minKm < sorted[i - 1].maxKm) {
      return `Overlapping range: "${sorted[i - 1].label}" and "${sorted[i].label}".`;
    }
  }
  return null;
}

export default function PricingPage() {
  const [rule, setRule] = useState<PricingRule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [travelBands, setTravelBands] = useState<TravelBand[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bandModalOpen, setBandModalOpen] = useState(false);
  const [newBand, setNewBand] = useState<TravelBand>({ minKm: 0, maxKm: 0, feeCents: 0, label: "" });
  const { canEdit, reason } = useAdminUi();

  async function loadPricing() {
    try {
      setError(null);
      const res = await fetch("/api/admin/pricing", { credentials: "include" });
      const raw = await res.json().catch(() => ({}));
      const data = raw.data ?? raw;
      if (!res.ok || !data.rule) {
        setError(data.error || raw.error || "Failed to load pricing rules.");
        return;
      }
      setRule(data.rule);
      setTravelBands(parseTravelBands(data.rule?.travelBandRulesJson));
    } catch {
      setError("Failed to load pricing rules.");
    }
  }

  useEffect(() => {
    void loadPricing();
  }, []);

  function handleSaveClick() {
    const validationError = validateBands(travelBands);
    if (validationError) {
      setError(validationError);
      return;
    }
    setConfirmOpen(true);
  }

  async function doSave() {
    if (!rule || !canEdit) return;
    setConfirmOpen(false);
    setSaving(true);
    setError(null);
    try {
      const sorted = [...travelBands].sort((a, b) => a.minKm - b.minKm);
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, travelBandRulesJson: sorted })
      });
      if (!res.ok) throw new Error("save failed");
      setTravelBands(sorted);
    } catch {
      setError("Failed to save pricing.");
    } finally {
      setSaving(false);
    }
  }

  function openAddBandModal() {
    const nextMin = travelBands.length > 0 ? travelBands[travelBands.length - 1].maxKm : 0;
    setNewBand({ minKm: nextMin, maxKm: nextMin + 5, feeCents: 0, label: "" });
    setBandModalOpen(true);
  }

  function saveBand() {
    if (!newBand.label.trim()) {
      setError("Band label is required.");
      return;
    }
    if (newBand.maxKm <= newBand.minKm) {
      setError("Band max km must be greater than min km.");
      return;
    }
    if (newBand.feeCents < 0) {
      setError("Band fee must be non-negative.");
      return;
    }
    setError(null);
    setTravelBands((prev) => [...prev, { ...newBand, label: newBand.label.trim() }]);
    setBandModalOpen(false);
  }

  function removeBand(index: number) {
    setTravelBands((prev) => prev.filter((_, i) => i !== index));
  }

  function updateBand(index: number, field: keyof TravelBand, value: string | number) {
    setTravelBands((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  }

  if (!rule) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <h1>Pricing</h1>
        <p>{error || "Loading..."}</p>
        <Button variant="outline" onClick={() => void loadPricing()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Setup</p>
            <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              Pricing
              <Badge variant={rule.isActive ? "default" : "secondary"}>
                {rule.isActive ? "Active" : "Inactive"}
              </Badge>
            </h1>
            <p>Update pricing rules used to generate quotes.</p>
          </div>
        </div>
        {!canEdit ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
            {reason || "Read-only access: pricing changes are disabled."}
          </div>
        ) : null}

      <LabeledInput
        label="Call-out fee (ZAR)"
        value={toZar(rule.calloutFeeCents)}
        onChange={(e) =>
          setRule({ ...rule, calloutFeeCents: Math.round(Number(e.target.value) * 100) })
        }
      />
      <LabeledInput
        label="Platform fee (ZAR)"
        value={toZar(rule.platformFeeCents)}
        onChange={(e) =>
          setRule({ ...rule, platformFeeCents: Math.round(Number(e.target.value) * 100) })
        }
      />
      <LabeledInput
        label="Platform fee percent (BPS, optional)"
        value={rule.platformFeePercentBps ? String(rule.platformFeePercentBps) : ""}
        onChange={(e) =>
          setRule({
            ...rule,
            platformFeePercentBps: e.target.value ? Number(e.target.value) : null
          })
        }
        helperText="If set, percent-based fee overrides fixed fee."
      />
      <LabeledInput
        label="Parts markup (BPS)"
        value={String(rule.partsMarkupBps)}
        onChange={(e) => setRule({ ...rule, partsMarkupBps: Number(e.target.value) })}
      />

      <div className="mt-4">
        <h3>Travel bands</h3>
        <p className="text-sm text-muted-foreground">Define distance-based travel fee tiers.</p>
        {travelBands.length > 0 ? (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Min km</th>
                  <th>Max km</th>
                  <th>Fee (ZAR)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {travelBands.map((band, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={band.label}
                        onChange={(e) => updateBand(index, "label", e.target.value)}
                        placeholder="e.g. Local"
                        disabled={!canEdit}
                      />
                    </td>
                    <td>
                      <input
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        type="number"
                        min={0}
                        value={band.minKm}
                        onChange={(e) => updateBand(index, "minKm", Number(e.target.value))}
                        disabled={!canEdit}
                      />
                    </td>
                    <td>
                      <input
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        type="number"
                        min={0}
                        value={band.maxKm}
                        onChange={(e) => updateBand(index, "maxKm", Number(e.target.value))}
                        disabled={!canEdit}
                      />
                    </td>
                    <td>
                      <input
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        type="number"
                        min={0}
                        value={toZar(band.feeCents)}
                        onChange={(e) => updateBand(index, "feeCents", Math.round(Number(e.target.value) * 100))}
                        disabled={!canEdit}
                      />
                    </td>
                    <td>
                      {canEdit ? (
                        <RecordActionButton action="delete" label={`Delete travel band ${band.label || index + 1}`} onClick={() => removeBand(index)} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2">No travel bands configured.</p>
        )}
        {canEdit ? (
          <RecordActionButton className="mt-2" action="add" label="Add travel band" onClick={openAddBandModal} />
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={rule.afterHoursEnabled}
          onChange={(e) => setRule({ ...rule, afterHoursEnabled: e.target.checked })}
        />
        After-hours enabled
      </label>
      <LabeledInput
        label="After-hours surcharge (BPS)"
        value={String(rule.afterHoursSurchargeBps)}
        onChange={(e) => setRule({ ...rule, afterHoursSurchargeBps: Number(e.target.value) })}
      />
      <LabeledInput
        label="Effective from (ISO)"
        value={rule.effectiveFrom}
        onChange={(e) => setRule({ ...rule, effectiveFrom: e.target.value })}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={rule.isActive}
          onChange={(e) => setRule({ ...rule, isActive: e.target.checked })}
        />
        Active
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {canEdit ? (
        <Button
          variant="outline"
          onClick={handleSaveClick}
          disabled={saving}
        >
          <Save style={{ width: 16, height: 16, marginRight: 8 }} />
          {saving ? "Saving..." : "Save pricing"}
        </Button>
      ) : null}

        <ConfirmDialog
        open={confirmOpen}
        title="Save pricing changes"
        message="You are about to update the pricing rules. This will affect all future quotes."
        detail={`Call-out: R${toZar(rule.calloutFeeCents)}, Platform: R${toZar(rule.platformFeeCents)}, ${travelBands.length} travel band(s)`}
        confirmLabel="Save pricing"
        onConfirm={doSave}
        onCancel={() => setConfirmOpen(false)}
        loading={saving}
      />

        <ActionModal
        open={bandModalOpen}
        title="Add travel band"
        description="Capture one range at a time, then return to the pricing table."
        size="sm"
        onClose={() => setBandModalOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <LabeledInput
            label="Label"
            value={newBand.label}
            onChange={(e) => setNewBand((prev) => ({ ...prev, label: e.target.value }))}
            helperText="Example: Local, Mid-range, Out-of-zone."
          />
          <LabeledInput
            label="Min km"
            value={String(newBand.minKm)}
            inputMode="numeric"
            onChange={(e) => setNewBand((prev) => ({ ...prev, minKm: Number(e.target.value) || 0 }))}
          />
          <LabeledInput
            label="Max km"
            value={String(newBand.maxKm)}
            inputMode="numeric"
            onChange={(e) => setNewBand((prev) => ({ ...prev, maxKm: Number(e.target.value) || 0 }))}
          />
          <LabeledInput
            label="Fee (ZAR)"
            value={toZar(newBand.feeCents)}
            inputMode="numeric"
            onChange={(e) =>
              setNewBand((prev) => ({
                ...prev,
                feeCents: Math.max(0, Math.round((Number(e.target.value) || 0) * 100))
              }))
            }
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setBandModalOpen(false)}>
              Exit
            </Button>
            <Button onClick={saveBand}>
              Save band
            </Button>
          </div>
        </div>
        </ActionModal>
      </div>
    </div>
  );
}
