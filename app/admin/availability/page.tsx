"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { useAdminUi } from "../admin-ui";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import ActionModal from "@/app/components/ActionModal";
import RecordActionButton from "@/app/components/RecordActionButton";
import { formatDateZA } from "@/lib/format/date";
type Block = {
  id: string;
  date: string;
  reason?: string | null;
  isEmergency?: boolean;
};

type DayHours = {
  day: string;
  isOpen: boolean;
  start: string;
  end: string;
};

type AvailabilityConfig = {
  slotMinutes: number;
  setupBufferMinutes: number;
  wrapBufferMinutes: number;
  noticeHours: number;
};

const DEFAULT_DAY_HOURS: DayHours[] = [
  { day: "Mon", isOpen: true, start: "08:00", end: "18:00" },
  { day: "Tue", isOpen: true, start: "08:00", end: "18:00" },
  { day: "Wed", isOpen: true, start: "08:00", end: "18:00" },
  { day: "Thu", isOpen: true, start: "08:00", end: "18:00" },
  { day: "Fri", isOpen: true, start: "08:00", end: "18:00" },
  { day: "Sat", isOpen: true, start: "08:00", end: "16:00" },
  { day: "Sun", isOpen: false, start: "08:00", end: "16:00" }
];

const DEFAULT_CONFIG: AvailabilityConfig = {
  slotMinutes: 30,
  setupBufferMinutes: 10,
  wrapBufferMinutes: 10,
  noticeHours: 24
};

function parseBusinessHours(raw: string): DayHours[] {
  if (!raw) return DEFAULT_DAY_HOURS;
  try {
    const parsed = JSON.parse(raw) as DayHours[];
    if (!Array.isArray(parsed) || parsed.length !== 7) return DEFAULT_DAY_HOURS;
    return parsed.map((item, index) => ({
      day: DEFAULT_DAY_HOURS[index].day,
      isOpen: Boolean(item?.isOpen),
      start: item?.start || DEFAULT_DAY_HOURS[index].start,
      end: item?.end || DEFAULT_DAY_HOURS[index].end
    }));
  } catch {
    return DEFAULT_DAY_HOURS;
  }
}

export default function AvailabilityPage() {
  const [businessHours, setBusinessHours] = useState<DayHours[]>(DEFAULT_DAY_HOURS);
  const [slotConfig, setSlotConfig] = useState<AvailabilityConfig>(DEFAULT_CONFIG);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [emergencyConfirmOpen, setEmergencyConfirmOpen] = useState(false);
  const { canEdit, reason } = useAdminUi();

  const businessHoursPayload = useMemo(() => JSON.stringify(businessHours), [businessHours]);
  const openDays = businessHours.filter((item) => item.isOpen).length;
  const summaryHours = businessHours
    .filter((item) => item.isOpen)
    .map((item) => `${item.day} ${item.start}-${item.end}`)
    .join(" | ");

  async function loadAvailability() {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, blocksRes] = await Promise.all([
        fetch("/api/admin/availability/settings", { credentials: "include" }),
        fetch("/api/admin/availability/blocks", { credentials: "include" })
      ]);
      const settingsRaw = await settingsRes.json().catch(() => ({}));
      const blockRaw = await blocksRes.json().catch(() => ({}));
      const settings = settingsRaw.data ?? settingsRaw;
      const blockData = blockRaw.data ?? blockRaw;

      if (!settingsRes.ok) {
        setError(settings.error || settingsRaw.error || "Failed to load availability settings.");
      } else {
        setBusinessHours(parseBusinessHours(settings.businessHours || ""));
        if (settings.availabilityConfig) {
          setSlotConfig({ ...DEFAULT_CONFIG, ...settings.availabilityConfig });
        }
      }

      if (!blocksRes.ok) {
        setError((prev) => prev || blockData.error || blockRaw.error || "Failed to load blackout dates.");
      } else {
        setBlocks(blockData.blocks || []);
      }
    } catch {
      setError("Failed to load availability.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAvailability();
  }, []);

  async function saveSettings() {
    if (!canEdit) return false;
    setSavingSettings(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/availability/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessHours: businessHoursPayload,
          availabilityConfig: slotConfig
        }),
        credentials: "include"
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save settings.");
        return false;
      }
      return true;
    } catch {
      setError("Failed to save settings.");
      return false;
    } finally {
      setSavingSettings(false);
    }
  }

  async function doAddBlock() {
    if (!canEdit || !blockDate) return false;
    setAddingBlock(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/availability/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: blockDate, reason: blockReason, isEmergency }),
        credentials: "include"
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to add blackout date.");
        return false;
      }
      const raw = await res.json();
      const data = raw.data ?? raw;
      setBlocks((prev) => [...prev, data.block]);
      setBlockDate("");
      setBlockReason("");
      setIsEmergency(false);
      return true;
    } finally {
      setAddingBlock(false);
    }
  }

  async function removeBlock(id: string) {
    if (!canEdit) return;
    setError(null);
    const res = await fetch("/api/admin/availability/blocks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      credentials: "include"
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to remove blackout date.");
      return;
    }
    setBlocks((prev) => prev.filter((block) => block.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border border-border p-5">
        <h1>Availability</h1>
        <p>Keep list views focused, and open edit modals only when needed.</p>
        {!canEdit ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
            {reason || "Read-only access: availability changes are disabled."}
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? <p>Loading availability...</p> : null}
        {!loading ? (
          <Button variant="outline" onClick={() => void loadAvailability()}>
            Retry load
          </Button>
        ) : null}
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <h2>Scheduling settings</h2>
          {canEdit ? (
            <Button onClick={() => setSettingsModalOpen(true)}>Edit settings</Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-4 mt-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <span>Open days</span>
            <strong>{openDays} / 7</strong>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <span>Slot duration</span>
            <strong>{slotConfig.slotMinutes} min</strong>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <span>Buffers</span>
            <strong>
              Setup {slotConfig.setupBufferMinutes}m / Wrap {slotConfig.wrapBufferMinutes}m
            </strong>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <span>Notice window</span>
            <strong>{slotConfig.noticeHours} hours</strong>
          </div>
          <p className="text-sm text-muted-foreground" style={{ fontSize: 12 }}>
            {summaryHours || "No open business hours configured."}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <h2>Blackout dates</h2>
          {canEdit ? (
            <RecordActionButton action="add" label="Add blackout date" onClick={() => setBlockModalOpen(true)} />
          ) : null}
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reason</th>
                <th>Type</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {blocks.length === 0 ? (
                <tr>
                  <td colSpan={4}>No blackout dates yet.</td>
                </tr>
              ) : null}
              {blocks.map((block) => (
                <tr key={block.id}>
                  <td>{formatDateZA(block.date)}</td>
                  <td>{block.reason || "n/a"}</td>
                  <td>{block.isEmergency ? "Emergency" : "Standard"}</td>
                  <td>
                    {canEdit ? (
                      <RecordActionButton action="delete" label="Delete blackout date" onClick={() => removeBlock(block.id)} type="button" />
                    ) : (
                      "Read-only"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ActionModal
        open={settingsModalOpen}
        title="Edit scheduling settings"
        description="Update operating hours, slot duration, and notice rules."
        size="lg"
        onClose={() => {
          if (savingSettings) return;
          setSettingsModalOpen(false);
        }}
      >
        <div className="flex flex-col gap-4">
          <strong>Operating hours</strong>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Open</th>
                  <th>Start</th>
                  <th>End</th>
                </tr>
              </thead>
              <tbody>
                {businessHours.map((entry, index) => (
                  <tr key={entry.day}>
                    <td>{entry.day}</td>
                    <td>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={entry.isOpen}
                          onChange={(e) =>
                            setBusinessHours((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, isOpen: e.target.checked } : item
                              )
                            )
                          }
                          disabled={!canEdit || savingSettings}
                        />
                      </label>
                    </td>
                    <td>
                      <input
                        type="time"
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={entry.start}
                        onChange={(e) =>
                          setBusinessHours((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, start: e.target.value } : item
                            )
                          )
                        }
                        disabled={!canEdit || savingSettings || !entry.isOpen}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={entry.end}
                        onChange={(e) =>
                          setBusinessHours((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, end: e.target.value } : item
                            )
                          )
                        }
                        disabled={!canEdit || savingSettings || !entry.isOpen}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <strong>Slot configuration</strong>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Slot duration (minutes)</span>
              <select
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={slotConfig.slotMinutes}
                onChange={(e) => setSlotConfig({ ...slotConfig, slotMinutes: Number(e.target.value) })}
                disabled={!canEdit || savingSettings}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Setup buffer (minutes)</span>
              <input
                type="number"
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                min={0}
                max={60}
                value={slotConfig.setupBufferMinutes}
                onChange={(e) => setSlotConfig({ ...slotConfig, setupBufferMinutes: Number(e.target.value) })}
                disabled={!canEdit || savingSettings}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Wrap buffer (minutes)</span>
              <input
                type="number"
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                min={0}
                max={60}
                value={slotConfig.wrapBufferMinutes}
                onChange={(e) => setSlotConfig({ ...slotConfig, wrapBufferMinutes: Number(e.target.value) })}
                disabled={!canEdit || savingSettings}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Advance notice (hours)</span>
              <input
                type="number"
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                min={0}
                max={168}
                value={slotConfig.noticeHours}
                onChange={(e) => setSlotConfig({ ...slotConfig, noticeHours: Number(e.target.value) })}
                disabled={!canEdit || savingSettings}
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setSettingsModalOpen(false)} disabled={savingSettings}>
              Exit
            </Button>
            <Button
              disabled={savingSettings || !canEdit}
              onClick={async () => {
                const ok = await saveSettings();
                if (ok) setSettingsModalOpen(false);
              }}
            >
              {savingSettings ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </div>
      </ActionModal>

      <ActionModal
        open={blockModalOpen}
        title="Add blackout date"
        description="Capture the blocked date and optional reason."
        onClose={() => {
          if (addingBlock) return;
          setBlockModalOpen(false);
        }}
      >
        <div className="flex flex-col gap-4">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Date</span>
            <input
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <LabeledInput
            label="Reason (optional)"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
            />
            Emergency block (same-day override)
          </label>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setBlockModalOpen(false)} disabled={addingBlock}>
              Exit
            </Button>
            <Button
              disabled={addingBlock || !blockDate || !canEdit}
              onClick={async () => {
                if (isEmergency) {
                  setEmergencyConfirmOpen(true);
                  return;
                }
                const ok = await doAddBlock();
                if (ok) setBlockModalOpen(false);
              }}
            >
              {addingBlock ? "Saving..." : "Save date"}
            </Button>
          </div>
        </div>
      </ActionModal>

      <ConfirmDialog
        open={emergencyConfirmOpen}
        title="Emergency block"
        message="This will block availability for today or a very near date. Existing bookings on this date may be affected."
        detail={blockDate ? `Blocking: ${blockDate}${blockReason ? ` — ${blockReason}` : ""}` : undefined}
        confirmLabel="Add emergency block"
        variant="danger"
        loading={addingBlock}
        onConfirm={async () => {
          const ok = await doAddBlock();
          if (ok) {
            setEmergencyConfirmOpen(false);
            setBlockModalOpen(false);
          }
        }}
        onCancel={() => setEmergencyConfirmOpen(false)}
      />
    </div>
  );
}
