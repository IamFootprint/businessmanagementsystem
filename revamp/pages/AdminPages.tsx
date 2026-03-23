import { useEffect, useMemo, useState } from "react";
import { WorkspaceShell } from "@/revamp/components/WorkspaceShell";
import { ADMIN_NAV_GROUPS } from "@/revamp/lib/navigation";
import { Button } from "@/revamp/components/ui/button";
import { Input } from "@/revamp/components/ui/input";
import { Textarea } from "@/revamp/components/ui/textarea";
import { apiFetch } from "@/lib/client/api";
import { formatDateTimeLongZA, formatZarFromCents } from "@/revamp/lib/formatters";

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="section-heading">
      <div>
        <h1 className="text-xl font-display font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ErrorCard({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
      <p className="text-sm text-status-cancelled">{error}</p>
    </div>
  );
}

type SchedulingPolicy = {
  defaultNoticeHours: number;
  assignmentMode: "AUTO" | "MANUAL";
};

type UnassignedJob = {
  id: string;
  ref: string;
  bookingRef?: string;
  customerName?: string;
  serviceNameSnapshot?: string;
  slotIso: string;
};

export function AdminScheduling() {
  const [policy, setPolicy] = useState<SchedulingPolicy>({ defaultNoticeHours: 24, assignmentMode: "AUTO" });
  const [jobs, setJobs] = useState<UnassignedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [policyData, jobsData] = await Promise.all([
        apiFetch<{ policy: SchedulingPolicy }>("/api/admin/scheduling/policy"),
        apiFetch<{ jobCards: UnassignedJob[] }>("/api/admin/job-cards/unassigned"),
      ]);
      setPolicy(policyData.policy || { defaultNoticeHours: 24, assignmentMode: "AUTO" });
      setJobs(jobsData.jobCards || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load scheduling policy.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ policy: SchedulingPolicy }>("/api/admin/scheduling/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });
      setPolicy(data.policy || policy);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save policy.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Scheduling">
      <div className="stack-lg">
        <SectionHeader title="Scheduling" description="Assign mechanics and manage slot policy." />
        <ErrorCard error={error} />
        <div className="panel-padded stack-sm">
          {loading ? <p className="text-sm text-muted-foreground">Loading scheduling policy...</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={0}
              value={String(policy.defaultNoticeHours)}
              onChange={(event) => setPolicy((prev) => ({ ...prev, defaultNoticeHours: Math.max(0, Number(event.target.value || 0)) }))}
              placeholder="Notice hours"
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={policy.assignmentMode}
              onChange={(event) =>
                setPolicy((prev) => ({ ...prev, assignmentMode: event.target.value === "MANUAL" ? "MANUAL" : "AUTO" }))
              }
            >
              <option value="AUTO">Auto assignment</option>
              <option value="MANUAL">Manual assignment</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving..." : "Save Policy"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Job</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Service</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Slot</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-sm text-muted-foreground">No unassigned jobs.</td>
                </tr>
              ) : null}
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">{job.ref}</td>
                  <td className="px-4 py-3">{job.customerName || "—"}</td>
                  <td className="px-4 py-3">{job.serviceNameSnapshot || "—"}</td>
                  <td className="px-4 py-3">{formatDateTimeLongZA(job.slotIso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WorkspaceShell>
  );
}

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unitPriceCents: number;
  stockOnHand?: number;
  isActive: boolean;
};

export function AdminInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ items: InventoryItem[] }>("/api/admin/inventory");
      setItems(data.items || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load inventory.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createItem() {
    if (!name.trim() || !category.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          unitPriceCents: Math.round(Number(price || 0) * 100),
          stockOnHand: stock ? Number(stock) : undefined,
          isActive: true,
        }),
      });
      setName("");
      setCategory("");
      setPrice("");
      setStock("");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create inventory item.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: InventoryItem) {
    setError(null);
    try {
      await apiFetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, isActive: !row.isActive } : row)));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update item.");
    }
  }

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Inventory">
      <div className="stack-lg">
        <SectionHeader title="Inventory" description="Parts, consumables, and usage tracking." />
        <ErrorCard error={error} />

        <div className="panel-padded stack-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add Item</p>
          <div className="grid grid-cols-2 gap-2">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Item name" />
            <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category" />
            <Input type="number" min={0} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Price (ZAR)" />
            <Input type="number" min={0} value={stock} onChange={(event) => setStock(event.target.value)} placeholder="Stock (optional)" />
          </div>
          <Button size="sm" onClick={() => void createItem()} disabled={saving || !name.trim() || !category.trim()}>
            {saving ? "Saving..." : "Create Item"}
          </Button>
        </div>

        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Price</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Stock</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-sm text-muted-foreground">Loading inventory...</td>
                </tr>
              ) : null}
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-sm text-muted-foreground">No inventory items yet.</td>
                </tr>
              ) : null}
              {!loading && items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">{formatZarFromCents(item.unitPriceCents)}</td>
                  <td className="px-4 py-3">{item.stockOnHand ?? "—"}</td>
                  <td className="px-4 py-3">{item.isActive ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => void toggle(item)}>
                      {item.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WorkspaceShell>
  );
}

type PricingRule = {
  calloutFeeCents: number;
  platformFeeCents: number;
  platformFeePercentBps?: number | null;
  partsMarkupBps: number;
  travelBandRulesJson: Array<{ minKm: number; maxKm: number | null; feeCents: number; label?: string }>;
  afterHoursEnabled: boolean;
  afterHoursSurchargeBps: number;
  effectiveFrom: string;
  isActive: boolean;
};

type TravelBand = {
  minKm: number;
  maxKm: number | null;
  feeCents: number;
  label: string;
};

function parseTravelBands(raw: PricingRule["travelBandRulesJson"] | unknown): TravelBand[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((band) => ({
    minKm: Math.max(0, Number(band?.minKm || 0)),
    maxKm: band?.maxKm === null || band?.maxKm === undefined ? null : Math.max(0, Number(band.maxKm || 0)),
    feeCents: Math.max(0, Number(band?.feeCents || 0)),
    label: String(band?.label || "").trim(),
  }));
}

function validateTravelBands(bands: TravelBand[]) {
  const sorted = [...bands].sort((a, b) => a.minKm - b.minKm);
  for (let index = 0; index < sorted.length; index += 1) {
    const band = sorted[index];
    if (!band.label.trim()) return `Travel band ${index + 1} needs a label.`;
    if (band.maxKm !== null && band.maxKm <= band.minKm) {
      return `Travel band ${index + 1} max distance must be greater than min distance.`;
    }
    if (index > 0) {
      const previous = sorted[index - 1];
      const previousMax = previous.maxKm ?? Number.POSITIVE_INFINITY;
      if (band.minKm < previousMax) {
        return `Travel bands overlap between ${previous.label || `row ${index}`} and ${band.label || `row ${index + 1}`}.`;
      }
    }
  }
  return null;
}

export function AdminPricing() {
  const [rule, setRule] = useState<PricingRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [travelBands, setTravelBands] = useState<TravelBand[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ rule: PricingRule }>("/api/admin/pricing");
      setRule(data.rule || null);
      setTravelBands(parseTravelBands(data.rule?.travelBandRulesJson || []));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load pricing.");
      setRule(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!rule) return;
    const validationError = validateTravelBands(travelBands);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rule,
          travelBandRulesJson: [...travelBands].sort((a, b) => a.minKm - b.minKm),
        }),
      });
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save pricing.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Pricing">
      <div className="stack-lg">
        <SectionHeader title="Pricing" description="Rates, pricing rules, and packaged offers." />
        <ErrorCard error={error} />
        {loading ? <div className="panel-padded"><p className="text-sm text-muted-foreground">Loading pricing rule...</p></div> : null}
        {rule ? (
          <div className="panel-padded stack-sm">
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" min={0} value={String(Math.round(rule.calloutFeeCents / 100))} onChange={(e) => setRule((prev) => prev ? { ...prev, calloutFeeCents: Math.round(Number(e.target.value || 0) * 100) } : prev)} placeholder="Callout fee (ZAR)" />
              <Input type="number" min={0} value={String(Math.round(rule.platformFeeCents / 100))} onChange={(e) => setRule((prev) => prev ? { ...prev, platformFeeCents: Math.round(Number(e.target.value || 0) * 100) } : prev)} placeholder="Platform fee (ZAR)" />
              <Input type="number" min={0} value={String(rule.platformFeePercentBps || "")} onChange={(e) => setRule((prev) => prev ? { ...prev, platformFeePercentBps: e.target.value ? Math.max(0, Number(e.target.value || 0)) : null } : prev)} placeholder="Platform fee percent (BPS, optional)" />
              <Input type="number" min={0} value={String(rule.partsMarkupBps)} onChange={(e) => setRule((prev) => prev ? { ...prev, partsMarkupBps: Math.max(0, Number(e.target.value || 0)) } : prev)} placeholder="Parts markup (BPS)" />
              <Input type="number" min={0} value={String(rule.afterHoursSurchargeBps)} onChange={(e) => setRule((prev) => prev ? { ...prev, afterHoursSurchargeBps: Math.max(0, Number(e.target.value || 0)) } : prev)} placeholder="After-hours surcharge (BPS)" />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={rule.afterHoursEnabled} onChange={(e) => setRule((prev) => prev ? { ...prev, afterHoursEnabled: e.target.checked } : prev)} />
              After-hours pricing enabled
            </label>
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Travel Bands</p>
              {travelBands.length === 0 ? <p className="text-sm text-muted-foreground">No travel bands yet.</p> : null}
              {travelBands.map((band, index) => (
                <div key={`${index}-${band.label}`} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    className="col-span-4"
                    value={band.label}
                    onChange={(event) =>
                      setTravelBands((prev) =>
                        prev.map((entry, rowIndex) => (rowIndex === index ? { ...entry, label: event.target.value } : entry))
                      )
                    }
                    placeholder="Label"
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    min={0}
                    value={String(band.minKm)}
                    onChange={(event) =>
                      setTravelBands((prev) =>
                        prev.map((entry, rowIndex) => (rowIndex === index ? { ...entry, minKm: Math.max(0, Number(event.target.value || 0)) } : entry))
                      )
                    }
                    placeholder="Min km"
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    min={0}
                    value={band.maxKm === null ? "" : String(band.maxKm)}
                    onChange={(event) =>
                      setTravelBands((prev) =>
                        prev.map((entry, rowIndex) => (
                          rowIndex === index
                            ? { ...entry, maxKm: event.target.value ? Math.max(0, Number(event.target.value || 0)) : null }
                            : entry
                        ))
                      )
                    }
                    placeholder="Max km"
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    min={0}
                    value={String(Math.round(band.feeCents / 100))}
                    onChange={(event) =>
                      setTravelBands((prev) =>
                        prev.map((entry, rowIndex) => (
                          rowIndex === index ? { ...entry, feeCents: Math.max(0, Math.round(Number(event.target.value || 0) * 100)) } : entry
                        ))
                      )
                    }
                    placeholder="Fee (ZAR)"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="col-span-1 text-destructive"
                    onClick={() => setTravelBands((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setTravelBands((prev) => {
                    const sorted = [...prev].sort((a, b) => a.minKm - b.minKm);
                    const minKm = sorted.length ? sorted[sorted.length - 1].maxKm ?? sorted[sorted.length - 1].minKm + 5 : 0;
                    return [...prev, { label: "", minKm: Math.max(0, minKm), maxKm: minKm + 5, feeCents: 0 }];
                  })
                }
              >
                Add Travel Band
              </Button>
            </div>
            <Button size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving..." : "Save Pricing"}
            </Button>
          </div>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

type AvailabilityConfig = {
  slotMinutes: number;
  setupBufferMinutes: number;
  wrapBufferMinutes: number;
  noticeHours: number;
};

type DayHours = {
  day: string;
  isOpen: boolean;
  start: string;
  end: string;
};

type AvailabilityBlock = {
  id: string;
  date: string;
  reason?: string | null;
  isEmergency?: boolean;
};

const DEFAULT_DAY_HOURS: DayHours[] = [
  { day: "Mon", isOpen: true, start: "08:00", end: "18:00" },
  { day: "Tue", isOpen: true, start: "08:00", end: "18:00" },
  { day: "Wed", isOpen: true, start: "08:00", end: "18:00" },
  { day: "Thu", isOpen: true, start: "08:00", end: "18:00" },
  { day: "Fri", isOpen: true, start: "08:00", end: "18:00" },
  { day: "Sat", isOpen: true, start: "08:00", end: "16:00" },
  { day: "Sun", isOpen: false, start: "08:00", end: "16:00" },
];

function parseBusinessHours(raw: string): DayHours[] {
  if (!raw) return DEFAULT_DAY_HOURS;
  try {
    const parsed = JSON.parse(raw) as DayHours[];
    if (!Array.isArray(parsed) || parsed.length !== 7) return DEFAULT_DAY_HOURS;
    return DEFAULT_DAY_HOURS.map((entry, index) => ({
      day: entry.day,
      isOpen: Boolean(parsed[index]?.isOpen),
      start: parsed[index]?.start || entry.start,
      end: parsed[index]?.end || entry.end,
    }));
  } catch {
    return DEFAULT_DAY_HOURS;
  }
}

export function AdminAvailability() {
  const [businessHours, setBusinessHours] = useState<DayHours[]>(DEFAULT_DAY_HOURS);
  const [config, setConfig] = useState<AvailabilityConfig>({
    slotMinutes: 30,
    setupBufferMinutes: 10,
    wrapBufferMinutes: 10,
    noticeHours: 24,
  });
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockEmergency, setBlockEmergency] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [settings, blocksData] = await Promise.all([
        apiFetch<{ businessHours: string; availabilityConfig: AvailabilityConfig }>("/api/admin/availability/settings"),
        apiFetch<{ blocks: AvailabilityBlock[] }>("/api/admin/availability/blocks"),
      ]);
      setBusinessHours(parseBusinessHours(settings.businessHours || ""));
      setConfig(settings.availabilityConfig || {
        slotMinutes: 30,
        setupBufferMinutes: 10,
        wrapBufferMinutes: 10,
        noticeHours: 24,
      });
      setBlocks(blocksData.blocks || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load availability.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveSettings() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/admin/availability/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessHours: JSON.stringify(businessHours), availabilityConfig: config }),
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save availability settings.");
    } finally {
      setSaving(false);
    }
  }

  async function addBlock() {
    if (!blockDate) return;
    setError(null);
    try {
      const data = await apiFetch<{ block: AvailabilityBlock }>("/api/admin/availability/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: blockDate, reason: blockReason || undefined, isEmergency: blockEmergency }),
      });
      setBlocks((prev) => [...prev, data.block]);
      setBlockDate("");
      setBlockReason("");
      setBlockEmergency(false);
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : "Unable to create blackout date.");
    }
  }

  async function removeBlock(id: string) {
    setError(null);
    try {
      await apiFetch("/api/admin/availability/blocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setBlocks((prev) => prev.filter((entry) => entry.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to remove blackout date.");
    }
  }

  const openDays = businessHours.filter((entry) => entry.isOpen).length;

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Availability">
      <div className="stack-lg">
        <SectionHeader title="Availability" description="Shop hours, blackout dates, and mechanic time." />
        <ErrorCard error={error} />
        {loading ? <div className="panel-padded"><p className="text-sm text-muted-foreground">Loading availability...</p></div> : null}

        <div className="panel-padded stack-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Scheduling Settings</p>
          <div className="rounded-md border border-border p-3 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">Open days</span>
            <span className="font-semibold text-foreground">{openDays} / 7</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" min={15} value={String(config.slotMinutes)} onChange={(e) => setConfig((prev) => ({ ...prev, slotMinutes: Math.max(15, Number(e.target.value || 0)) }))} placeholder="Slot minutes" />
            <Input type="number" min={0} value={String(config.noticeHours)} onChange={(e) => setConfig((prev) => ({ ...prev, noticeHours: Math.max(0, Number(e.target.value || 0)) }))} placeholder="Notice hours" />
            <Input type="number" min={0} value={String(config.setupBufferMinutes)} onChange={(e) => setConfig((prev) => ({ ...prev, setupBufferMinutes: Math.max(0, Number(e.target.value || 0)) }))} placeholder="Setup buffer" />
            <Input type="number" min={0} value={String(config.wrapBufferMinutes)} onChange={(e) => setConfig((prev) => ({ ...prev, wrapBufferMinutes: Math.max(0, Number(e.target.value || 0)) }))} placeholder="Wrap buffer" />
          </div>
          <div className="space-y-2">
            {businessHours.map((entry, index) => (
              <div key={entry.day} className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-2 text-sm font-semibold text-foreground">{entry.day}</span>
                <label className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={entry.isOpen}
                    onChange={(event) =>
                      setBusinessHours((prev) =>
                        prev.map((row, rowIndex) => (rowIndex === index ? { ...row, isOpen: event.target.checked } : row))
                      )
                    }
                  />
                  Open
                </label>
                <Input
                  className="col-span-4"
                  type="time"
                  value={entry.start}
                  onChange={(event) =>
                    setBusinessHours((prev) =>
                      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, start: event.target.value } : row))
                    )
                  }
                  disabled={!entry.isOpen}
                />
                <Input
                  className="col-span-4"
                  type="time"
                  value={entry.end}
                  onChange={(event) =>
                    setBusinessHours((prev) =>
                      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, end: event.target.value } : row))
                    )
                  }
                  disabled={!entry.isOpen}
                />
              </div>
            ))}
          </div>
          <Button size="sm" onClick={() => void saveSettings()} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        <div className="panel-padded stack-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Blackout Dates</p>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
            <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Reason (optional)" />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={blockEmergency} onChange={(e) => setBlockEmergency(e.target.checked)} />
            Emergency block
          </label>
          <Button size="sm" variant="outline" onClick={() => void addBlock()} disabled={!blockDate}>
            Add Block
          </Button>
          <div className="space-y-2">
            {blocks.length === 0 ? <p className="text-sm text-muted-foreground">No blackout dates configured.</p> : null}
            {blocks.map((block) => (
              <div key={block.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>{String(block.date).slice(0, 10)} {block.reason ? `• ${block.reason}` : ""}</span>
                <Button size="sm" variant="ghost" onClick={() => void removeBlock(block.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

type MechanicInvite = {
  id: string;
  phone: string;
  name?: string;
  role: string;
  createdAtIso: string;
  usedAtIso?: string;
};

type MechanicProfile = {
  id: string;
  phone: string;
  name?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAtIso: string;
};

export function AdminMechanics() {
  const [invites, setInvites] = useState<MechanicInvite[]>([]);
  const [mechanics, setMechanics] = useState<MechanicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [invitesData, mechanicsData] = await Promise.all([
        apiFetch<{ invites: MechanicInvite[] }>("/api/admin/mechanics/invites"),
        apiFetch<{ mechanics: MechanicProfile[] }>("/api/admin/mechanics"),
      ]);
      setInvites(invitesData.invites || []);
      setMechanics(mechanicsData.mechanics || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load mechanics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createInvite() {
    if (!phone.trim() || !firstName.trim() || !lastName.trim()) return;
    setError(null);
    try {
      const data = await apiFetch<{ invite: MechanicInvite; inviteUrl: string }>("/api/admin/mechanics/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });
      setInviteUrl(data.inviteUrl || "");
      setPhone("");
      setFirstName("");
      setLastName("");
      await load();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to create invite.");
    }
  }

  async function toggle(mechanic: MechanicProfile) {
    setError(null);
    try {
      const route = mechanic.status === "ACTIVE" ? "deactivate" : "activate";
      const data = await apiFetch<{ mechanic: MechanicProfile }>(`/api/admin/mechanics/${mechanic.id}/${route}`, { method: "POST" });
      setMechanics((prev) => prev.map((row) => (row.id === mechanic.id ? data.mechanic : row)));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update mechanic status.");
    }
  }

  const visibleMechanics = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return mechanics;
    return mechanics.filter((mechanic) =>
      `${mechanic.name || ""} ${mechanic.phone} ${mechanic.status}`.toLowerCase().includes(needle)
    );
  }, [mechanics, query]);

  const visibleInvites = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return invites;
    return invites.filter((invite) =>
      `${invite.name || ""} ${invite.phone} ${invite.usedAtIso ? "used" : "unused"}`.toLowerCase().includes(needle)
    );
  }, [invites, query]);

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Mechanics">
      <div className="stack-lg">
        <SectionHeader title="Mechanics" description="Invite, activate, and manage workshop staff." />
        <ErrorCard error={error} />
        {loading ? <div className="panel-padded"><p className="text-sm text-muted-foreground">Loading mechanic data...</p></div> : null}
        <div className="panel-padded grid grid-cols-3 gap-2">
          <div className="rounded-md border border-border p-3 text-sm">
            <p className="text-muted-foreground">Active mechanics</p>
            <p className="text-lg font-semibold text-foreground">{mechanics.filter((entry) => entry.status === "ACTIVE").length}</p>
          </div>
          <div className="rounded-md border border-border p-3 text-sm">
            <p className="text-muted-foreground">Inactive mechanics</p>
            <p className="text-lg font-semibold text-foreground">{mechanics.filter((entry) => entry.status !== "ACTIVE").length}</p>
          </div>
          <div className="rounded-md border border-border p-3 text-sm">
            <p className="text-muted-foreground">Pending invites</p>
            <p className="text-lg font-semibold text-foreground">{invites.filter((entry) => !entry.usedAtIso).length}</p>
          </div>
        </div>
        <div className="panel-padded">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by name, phone, or status" />
        </div>

        <div className="panel-padded stack-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Create Invite</p>
          <div className="grid grid-cols-3 gap-2">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
          </div>
          <Button size="sm" onClick={() => void createInvite()} disabled={!phone.trim() || !firstName.trim() || !lastName.trim()}>
            Create Invite
          </Button>
          {inviteUrl ? <p className="text-xs text-muted-foreground break-all">Invite URL: {inviteUrl}</p> : null}
        </div>

        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Phone</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Created</th>
                <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleMechanics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-sm text-muted-foreground">No mechanics found.</td>
                </tr>
              ) : null}
              {visibleMechanics.map((mechanic) => (
                <tr key={mechanic.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">{mechanic.name || "Mechanic"}</td>
                  <td className="px-4 py-3">{mechanic.phone}</td>
                  <td className="px-4 py-3">{mechanic.status}</td>
                  <td className="px-4 py-3">{formatDateTimeLongZA(mechanic.createdAtIso)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => void toggle(mechanic)}>
                      {mechanic.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Invitee</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Phone</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Created</th>
              </tr>
            </thead>
            <tbody>
              {visibleInvites.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-sm text-muted-foreground">No invites yet.</td>
                </tr>
              ) : null}
              {visibleInvites.map((invite) => (
                <tr key={invite.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">{invite.name || "Mechanic"}</td>
                  <td className="px-4 py-3">{invite.phone}</td>
                  <td className="px-4 py-3">{invite.usedAtIso ? "Used" : "Unused"}</td>
                  <td className="px-4 py-3">{formatDateTimeLongZA(invite.createdAtIso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WorkspaceShell>
  );
}

type AdminUser = {
  id: string;
  phone: string;
  name?: string;
  role: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("CLIENT");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ users: AdminUser[] }>("/api/admin/users");
      setUsers(data.users || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createUser() {
    if (!phone.trim() || !firstName.trim() || !lastName.trim()) return;
    setError(null);
    try {
      const data = await apiFetch<{ user: AdminUser }>("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
        }),
      });
      setUsers((prev) => [data.user, ...prev]);
      setPhone("");
      setFirstName("");
      setLastName("");
      setRole("CLIENT");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create user.");
    }
  }

  async function toggleStatus(user: AdminUser) {
    setError(null);
    try {
      const route = user.status === "ACTIVE" ? "deactivate" : "reactivate";
      const data = await apiFetch<{ user: AdminUser }>(`/api/admin/users/${user.id}/${route}`, { method: "POST" });
      setUsers((prev) => prev.map((row) => (row.id === user.id ? data.user : row)));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update user.");
    }
  }

  const visibleUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && user.status !== statusFilter) return false;
      if (!needle) return true;
      return `${user.phone} ${user.name || ""} ${user.role} ${user.status}`.toLowerCase().includes(needle);
    });
  }, [query, roleFilter, statusFilter, users]);

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Users">
      <div className="stack-lg">
        <SectionHeader title="Users" description="Shop user accounts and access roles." />
        <ErrorCard error={error} />
        {loading ? <div className="panel-padded"><p className="text-sm text-muted-foreground">Loading users...</p></div> : null}
        <div className="panel-padded grid grid-cols-3 gap-2">
          <div className="rounded-md border border-border p-3 text-sm">
            <p className="text-muted-foreground">Total users</p>
            <p className="text-lg font-semibold text-foreground">{users.length}</p>
          </div>
          <div className="rounded-md border border-border p-3 text-sm">
            <p className="text-muted-foreground">Active users</p>
            <p className="text-lg font-semibold text-foreground">{users.filter((entry) => entry.status === "ACTIVE").length}</p>
          </div>
          <div className="rounded-md border border-border p-3 text-sm">
            <p className="text-muted-foreground">Mechanics</p>
            <p className="text-lg font-semibold text-foreground">{users.filter((entry) => entry.role === "MECHANIC").length}</p>
          </div>
        </div>
        <div className="panel-padded grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="ALL">All roles</option>
            <option value="CLIENT">Client</option>
            <option value="MECHANIC">Mechanic</option>
            <option value="SHOP_OWNER">Shop owner</option>
            <option value="PLATFORM_OWNER">Platform owner</option>
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="panel-padded stack-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add User</p>
          <div className="grid grid-cols-4 gap-2">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="CLIENT">Client</option>
              <option value="MECHANIC">Mechanic</option>
              <option value="SHOP_OWNER">Shop owner</option>
              <option value="PLATFORM_OWNER">Platform owner</option>
            </select>
          </div>
          <Button size="sm" onClick={() => void createUser()} disabled={!phone.trim() || !firstName.trim() || !lastName.trim()}>
            Create User
          </Button>
        </div>

        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Phone</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Created</th>
                <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-sm text-muted-foreground">No users found.</td>
                </tr>
              ) : null}
              {visibleUsers.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">{user.phone}</td>
                  <td className="px-4 py-3">{user.name || "—"}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">{user.status}</td>
                  <td className="px-4 py-3">{formatDateTimeLongZA(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => void toggleStatus(user)}>
                      {user.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WorkspaceShell>
  );
}

type NotificationEvent = {
  id: string;
  eventType: string;
  channel: string;
  message: string;
  status: "QUEUED" | "SENT" | "FAILED";
  createdAtIso: string;
  lastError?: string;
  target?: string;
  bookingRef?: string;
};

export function AdminNotifications() {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ events: NotificationEvent[] }>("/api/admin/notifications");
      setEvents(data.events || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load notifications.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function resend(id: string) {
    setError(null);
    try {
      const data = await apiFetch<{ event: NotificationEvent }>("/api/admin/notifications/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setEvents((prev) => prev.map((event) => (event.id === id ? data.event : event)));
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Unable to re-queue notification.");
    }
  }

  const channels = useMemo(() => Array.from(new Set(events.map((event) => event.channel))).sort(), [events]);
  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      if (statusFilter !== "ALL" && event.status !== statusFilter) return false;
      if (channelFilter !== "ALL" && event.channel !== channelFilter) return false;
      if (!needle) return true;
      return `${event.eventType} ${event.message} ${event.target || ""} ${event.bookingRef || ""}`.toLowerCase().includes(needle);
    });
  }, [channelFilter, events, query, statusFilter]);
  const selectedEvent = filteredEvents.find((event) => event.id === selectedEventId) || null;

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Notifications">
      <div className="stack-lg">
        <SectionHeader title="Notifications" description="Review outbound workflow notifications." />
        <ErrorCard error={error} />
        {loading ? <div className="panel-padded"><p className="text-sm text-muted-foreground">Loading notification log...</p></div> : null}
        <div className="panel-padded grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search type, booking ref, message, target" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="QUEUED">Queued</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)}>
            <option value="ALL">All channels</option>
            {channels.map((channel) => (
              <option key={channel} value={channel}>{channel}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={() => void load()}>Refresh</Button>
        </div>
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Channel</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Message</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Created</th>
                <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-sm text-muted-foreground">No notification events found.</td>
                </tr>
              ) : null}
              {filteredEvents.map((event) => (
                <tr key={event.id} className="border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/30" onClick={() => setSelectedEventId(event.id)}>
                  <td className="px-4 py-3">{event.eventType}</td>
                  <td className="px-4 py-3">{event.channel}</td>
                  <td className="px-4 py-3">{event.status}</td>
                  <td className="px-4 py-3">
                    {event.message}
                    {event.lastError ? <p className="text-xs text-status-cancelled mt-1">{event.lastError}</p> : null}
                  </td>
                  <td className="px-4 py-3">{formatDateTimeLongZA(event.createdAtIso)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => void resend(event.id)}>Re-queue</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selectedEvent ? (
          <div className="panel-padded stack-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Event Detail</h2>
              <Button size="sm" variant="ghost" onClick={() => setSelectedEventId(null)}>Close</Button>
            </div>
            <p className="text-sm text-foreground"><span className="font-semibold">Type:</span> {selectedEvent.eventType}</p>
            <p className="text-sm text-foreground"><span className="font-semibold">Channel:</span> {selectedEvent.channel}</p>
            <p className="text-sm text-foreground"><span className="font-semibold">Status:</span> {selectedEvent.status}</p>
            <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Created:</span> {formatDateTimeLongZA(selectedEvent.createdAtIso)}</p>
            {selectedEvent.target ? <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Target:</span> {selectedEvent.target}</p> : null}
            {selectedEvent.bookingRef ? <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Booking:</span> {selectedEvent.bookingRef}</p> : null}
            <p className="text-sm text-foreground">{selectedEvent.message}</p>
            {selectedEvent.lastError ? <p className="text-sm text-status-cancelled">{selectedEvent.lastError}</p> : null}
          </div>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

type AuditLog = {
  id: string;
  actorDisplay?: string;
  action: string;
  entity: string;
  createdAt: string;
  outcome?: string;
  requestId?: string | null;
  targetDisplay?: string | null;
};

type AuditDetail = {
  id: string;
  eventName: string;
  eventCategory: string;
  action: string;
  outcome: string;
  severity: string;
  occurredAt: string;
  actorDisplay?: string | null;
  targetType?: string | null;
  targetDisplay?: string | null;
  reasonCode?: string | null;
  reasonText?: string | null;
  changedFields?: string[];
  beforeJson?: unknown;
  afterJson?: unknown;
  contextJson?: unknown;
  requestId?: string | null;
};

export function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actor, setActor] = useState("");
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ take: "300" });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (actor.trim()) params.set("actor", actor.trim());
      if (query.trim()) params.set("q", query.trim());
      if (outcome) params.set("outcome", outcome);
      const data = await apiFetch<{ logs: AuditLog[] }>(`/api/admin/audit?${params.toString()}`);
      setLogs(data.logs || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load audit trail.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [actor, fromDate, outcome, query, toDate]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let active = true;
    async function loadDetail() {
      setDetailLoading(true);
      try {
        const data = await apiFetch<{ event: AuditDetail }>(`/api/admin/audit/${selectedId}`);
        if (!active) return;
        setDetail(data.event || null);
      } catch {
        if (!active) return;
        setDetail(null);
      } finally {
        if (!active) return;
        setDetailLoading(false);
      }
    }
    void loadDetail();
    return () => {
      active = false;
    };
  }, [selectedId]);

  function renderJson(value: unknown) {
    if (value == null) return "{}";
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  function exportAudit(format: "csv" | "json") {
    const params = new URLSearchParams({ format, take: "300" });
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (actor.trim()) params.set("actor", actor.trim());
    if (query.trim()) params.set("q", query.trim());
    if (outcome) params.set("outcome", outcome);
    window.location.href = `/api/admin/audit/export?${params.toString()}`;
  }

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Audit">
      <div className="stack-lg">
        <SectionHeader title="Audit" description="Trace booking, catalogue, and status changes." />
        <ErrorCard error={error} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportAudit("csv")}>Export CSV</Button>
          <Button size="sm" variant="outline" onClick={() => exportAudit("json")}>Export JSON</Button>
          <Button size="sm" variant="outline" onClick={() => void load()}>Refresh</Button>
        </div>
        <div className="panel-padded grid grid-cols-1 md:grid-cols-5 gap-2">
          <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          <Input value={actor} onChange={(event) => setActor(event.target.value)} placeholder="Actor" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search request id, target, action" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={outcome} onChange={(event) => setOutcome(event.target.value)}>
            <option value="">All outcomes</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>
        {loading ? <div className="panel-padded"><p className="text-sm text-muted-foreground">Loading audit events...</p></div> : null}
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Time</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Actor</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Action</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Entity</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-sm text-muted-foreground">No audit entries found.</td>
                </tr>
              ) : null}
              {logs.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/30" onClick={() => setSelectedId(entry.id)}>
                  <td className="px-4 py-3">{formatDateTimeLongZA(entry.createdAt)}</td>
                  <td className="px-4 py-3">{entry.actorDisplay || "System"}</td>
                  <td className="px-4 py-3">{entry.action}</td>
                  <td className="px-4 py-3">{entry.entity}</td>
                  <td className="px-4 py-3 uppercase text-xs font-semibold">{entry.outcome || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selectedId ? (
          <div className="panel-padded stack-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Audit Event Detail</h2>
              <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>Close</Button>
            </div>
            {detailLoading ? <p className="text-sm text-muted-foreground">Loading event detail...</p> : null}
            {detail ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground"><span className="font-semibold">Event:</span> {detail.eventName}</p>
                <p className="text-sm text-foreground"><span className="font-semibold">Action:</span> {detail.action}</p>
                <p className="text-sm text-foreground"><span className="font-semibold">Outcome:</span> {detail.outcome}</p>
                <p className="text-sm text-foreground"><span className="font-semibold">Severity:</span> {detail.severity}</p>
                <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Actor:</span> {detail.actorDisplay || "System"}</p>
                <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Target:</span> {detail.targetType || "record"} {detail.targetDisplay ? `· ${detail.targetDisplay}` : ""}</p>
                {detail.reasonCode ? <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Reason:</span> {detail.reasonCode}</p> : null}
                {detail.reasonText ? <p className="text-sm text-muted-foreground">{detail.reasonText}</p> : null}
                {detail.changedFields?.length ? <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Changed fields:</span> {detail.changedFields.join(", ")}</p> : null}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Before</p>
                    <pre className="text-[11px] whitespace-pre-wrap break-words">{renderJson(detail.beforeJson)}</pre>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">After</p>
                    <pre className="text-[11px] whitespace-pre-wrap break-words">{renderJson(detail.afterJson)}</pre>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Context</p>
                    <pre className="text-[11px] whitespace-pre-wrap break-words">{renderJson(detail.contextJson)}</pre>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

type ShopSettings = {
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  baseLocation?: string;
  themeTokens?: {
    brandTagline?: string;
    logoUrl?: string;
    heroImageUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    headerBg?: string;
    surfaceColor?: string;
    textColor?: string;
    ctaLabel?: string;
  };
};

export function AdminSettings() {
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ shop: ShopSettings }>("/api/admin/settings/shop");
      setShop(data.shop || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load settings.");
      setShop(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!shop) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/admin/settings/shop", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shop),
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Settings">
      <div className="stack-lg">
        <SectionHeader title="Settings" description="Business details, theme, and support settings." />
        <ErrorCard error={error} />
        {loading ? <div className="panel-padded"><p className="text-sm text-muted-foreground">Loading settings...</p></div> : null}
        {shop ? (
          <div className="panel-padded stack-sm">
            <Input value={shop.name || ""} onChange={(e) => setShop((prev) => prev ? { ...prev, name: e.target.value } : prev)} placeholder="Shop name" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={shop.phone || ""} onChange={(e) => setShop((prev) => prev ? { ...prev, phone: e.target.value } : prev)} placeholder="Phone" />
              <Input value={shop.whatsapp || ""} onChange={(e) => setShop((prev) => prev ? { ...prev, whatsapp: e.target.value } : prev)} placeholder="WhatsApp" />
              <Input value={shop.email || ""} onChange={(e) => setShop((prev) => prev ? { ...prev, email: e.target.value } : prev)} placeholder="Email" />
              <Input value={shop.baseLocation || ""} onChange={(e) => setShop((prev) => prev ? { ...prev, baseLocation: e.target.value } : prev)} placeholder="Base location" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input value={shop.themeTokens?.brandTagline || ""} onChange={(e) => setShop((prev) => prev ? { ...prev, themeTokens: { ...(prev.themeTokens || {}), brandTagline: e.target.value } } : prev)} placeholder="Brand tagline" />
              <Input value={shop.themeTokens?.ctaLabel || ""} onChange={(e) => setShop((prev) => prev ? { ...prev, themeTokens: { ...(prev.themeTokens || {}), ctaLabel: e.target.value } } : prev)} placeholder="CTA label" />
            </div>
            <Button size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

type SupportTicket = {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAtIso: string;
  notes: Array<{ id: string; authorName: string; text: string; createdAtIso: string }>;
};

export function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [description, setDescription] = useState("");
  const [newNote, setNewNote] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [ticketQuery, setTicketQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      const data = await apiFetch<{ tickets: SupportTicket[] }>(`/api/admin/support/tickets${params.toString() ? `?${params.toString()}` : ""}`);
      setTickets(data.tickets || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load support tickets.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [categoryFilter, statusFilter]);

  async function createTicket() {
    if (!subject.trim() || !description.trim()) return;
    setError(null);
    try {
      const data = await apiFetch<{ ticket: SupportTicket }>("/api/admin/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          priority,
          description: description.trim(),
        }),
      });
      setTickets((prev) => [data.ticket, ...prev]);
      setSubject("");
      setCategory("general");
      setPriority("normal");
      setDescription("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create ticket.");
    }
  }

  async function openTicket(id: string) {
    setError(null);
    try {
      const data = await apiFetch<{ ticket: SupportTicket }>(`/api/admin/support/tickets/${id}`);
      setSelected(data.ticket || null);
      setNewNote("");
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Unable to load ticket details.");
    }
  }

  async function updateStatus(status: string) {
    if (!selected) return;
    setError(null);
    try {
      const data = await apiFetch<{ ticket: SupportTicket }>(`/api/admin/support/tickets/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setSelected(data.ticket);
      setTickets((prev) => prev.map((entry) => (entry.id === data.ticket.id ? data.ticket : entry)));
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update status.");
    }
  }

  async function addNote() {
    if (!selected || !newNote.trim()) return;
    setError(null);
    try {
      const data = await apiFetch<{ ticket: SupportTicket }>(`/api/admin/support/tickets/${selected.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newNote.trim() }),
      });
      setSelected(data.ticket);
      setTickets((prev) => prev.map((entry) => (entry.id === data.ticket.id ? data.ticket : entry)));
      setNewNote("");
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : "Unable to add note.");
    }
  }

  const selectedStatus = selected?.status || "open";
  const visibleTickets = useMemo(() => {
    const needle = ticketQuery.trim().toLowerCase();
    if (!needle) return tickets;
    return tickets.filter((ticket) =>
      `${ticket.subject} ${ticket.description} ${ticket.category} ${ticket.priority} ${ticket.status}`.toLowerCase().includes(needle)
    );
  }, [ticketQuery, tickets]);

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Support">
      <div className="stack-lg">
        <SectionHeader title="Support" description="Support handoff and internal notes." />
        <ErrorCard error={error} />
        {loading ? <div className="panel-padded"><p className="text-sm text-muted-foreground">Loading support tickets...</p></div> : null}
        <div className="panel-padded grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input value={ticketQuery} onChange={(event) => setTicketQuery(event.target.value)} placeholder="Search subject, category, priority" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="ALL">All categories</option>
            <option value="general">General</option>
            <option value="payment">Payment</option>
            <option value="cancellation">Cancellation</option>
            <option value="complaint">Complaint</option>
          </select>
          <Button size="sm" variant="outline" onClick={() => void load()}>Refresh</Button>
        </div>

        <div className="panel-padded stack-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Create Ticket</p>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
          <div className="grid grid-cols-2 gap-2">
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="general">General</option>
              <option value="payment">Payment</option>
              <option value="cancellation">Cancellation</option>
              <option value="complaint">Complaint</option>
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={4} />
          <Button size="sm" onClick={() => void createTicket()} disabled={!subject.trim() || !description.trim()}>
            Create Ticket
          </Button>
        </div>

        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Subject</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Priority</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase">Created</th>
                <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-sm text-muted-foreground">No support tickets found.</td>
                </tr>
              ) : null}
              {visibleTickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">{ticket.subject}</td>
                  <td className="px-4 py-3">{ticket.category}</td>
                  <td className="px-4 py-3">{ticket.priority}</td>
                  <td className="px-4 py-3">{ticket.status}</td>
                  <td className="px-4 py-3">{formatDateTimeLongZA(ticket.createdAtIso)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => void openTicket(ticket.id)}>View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected ? (
          <div className="panel-padded stack-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{selected.subject}</h2>
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            </div>
            <p className="text-sm text-muted-foreground">{selected.description}</p>
            <div className="flex items-center gap-2">
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={selectedStatus} onChange={(e) => void updateStatus(e.target.value)}>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="space-y-2">
              {(selected.notes || []).map((note) => (
                <div key={note.id} className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1">{note.authorName} • {formatDateTimeLongZA(note.createdAtIso)}</p>
                  <p className="text-sm text-foreground">{note.text}</p>
                </div>
              ))}
            </div>
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add internal note" rows={3} />
            <Button size="sm" onClick={() => void addNote()} disabled={!newNote.trim()}>Add Note</Button>
          </div>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}
