"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { COMMON_PART_BRANDS, PART_LOCATIONS, PARTS_BY_LOCATION } from "@/lib/parts/catalog";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import ErrorState from "@/app/components/ErrorState";
import { useNotify } from "@/app/components/ToastProvider";
import { apiFetch, getErrorHint, isApiClientError } from "@/lib/client/api";
import { formatDateTimeZA } from "@/lib/format/date";
import { StatusBadge, type BookingStatus } from "@/app/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
type Checklist = {
  intakeDone: boolean;
  washDone: boolean;
  drivetrain: boolean;
  brakes: boolean;
  wheels: boolean;
  suspension: boolean;
  torqueCheck: boolean;
  testRide: boolean;
};

type Part = {
  id?: string;
  inventoryItemId?: string;
  location?: string;
  name: string;
  brand?: string;
  qty: number;
  unitPriceCents?: number;
};

type AdditionalCharge = {
  id: string;
  name: string;
  amountCents: number;
  type: "CONSUMABLE" | "ADDITIONAL";
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
};

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unitPriceCents: number;
};

type Invoice = {
  id: string;
  ref: string;
  issuedAtIso: string;
  status: string;
  subtotalCents: number;
  totalCents: number;
  lineItems: { id: string; label: string; amountCents: number; qty?: number; type: string }[];
};

type JobCard = {
  id: string;
  ref: string;
  bookingRef: string;
  serviceName?: string;
  addressLine1: string;
  slotIso: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  notes: { id: string; atIso: string; authorProfileId?: string; text: string }[];
  checklist: Checklist;
  partsUsed: Part[];
  additionalCharges?: AdditionalCharge[];
  completion?: {
    completedAtIso?: string;
    customerSignoffName?: string;
    customerSignoffAccepted?: boolean;
    summary?: string;
  };
};

const statusOptions = [
  { value: "EN_ROUTE", label: "En route" },
  { value: "ARRIVED", label: "Arrived" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "AWAITING_APPROVAL", label: "Awaiting approval" }
];

const checklistFields: Array<{ key: keyof Checklist; label: string }> = [
  { key: "intakeDone", label: "Bike received" },
  { key: "washDone", label: "Washed" },
  { key: "drivetrain", label: "Drivetrain checked" },
  { key: "brakes", label: "Brakes checked" },
  { key: "wheels", label: "Wheels checked" },
  { key: "suspension", label: "Suspension checked" },
  { key: "torqueCheck", label: "Torque check" },
  { key: "testRide", label: "Test ride" }
];

const workflowSteps: Array<{
  id: string;
  title: string;
  detail: string;
  keys: Array<keyof Checklist>;
}> = [
  {
    id: "intake",
    title: "Step 1: Intake",
    detail: "Receive bike and complete wash-in preparation.",
    keys: ["intakeDone", "washDone"]
  },
  {
    id: "inspection",
    title: "Step 2: Inspection",
    detail: "Run full safety and component checks.",
    keys: ["drivetrain", "brakes", "wheels", "suspension"]
  },
  {
    id: "road-check",
    title: "Step 3: Validation",
    detail: "Finalize torque check and test ride.",
    keys: ["torqueCheck", "testRide"]
  }
];

function normalizeStatus(status: string): BookingStatus {
  return status.toLowerCase().replace(/_/g, "_") as BookingStatus;
}

const selectClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50";
const inputFieldClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50";

export default function JobCardDetailPage({ params }: { params: { jobCardId: string } }) {
  const notify = useNotify();
  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [noteText, setNoteText] = useState("");
  const [partsUsed, setPartsUsed] = useState<Part[]>([]);
  const [partLocation, setPartLocation] = useState(PART_LOCATIONS[0] || "Drivetrain");
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [partName, setPartName] = useState("");
  const [partBrand, setPartBrand] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [partPriceZar, setPartPriceZar] = useState("");
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [extraName, setExtraName] = useState("");
  const [extraAmountZar, setExtraAmountZar] = useState("");
  const [extraType, setExtraType] = useState<"CONSUMABLE" | "ADDITIONAL">("ADDITIONAL");
  const [customerName, setCustomerName] = useState("");
  const [approved, setApproved] = useState(false);
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);

  async function load() {
    setError(null);
    setErrorHint(null);
    try {
      const data = await apiFetch<{ jobCard: JobCard }>(`/api/mech/jobs/${params.jobCardId}`);
      setJobCard(data.jobCard);
      setPartsUsed(data.jobCard?.partsUsed || []);
      setAdditionalCharges(data.jobCard?.additionalCharges || []);
      const [invoiceRes, inventoryData] = await Promise.all([
        fetch(`/api/mech/jobs/${params.jobCardId}/invoice`),
        apiFetch<{ items: InventoryItem[] }>("/api/mech/inventory")
      ]);
      if (invoiceRes.ok) {
        const invoiceRaw = await invoiceRes.json();
        const invoiceData = invoiceRaw.data ?? invoiceRaw;
        setInvoice(invoiceData.invoice || null);
      } else {
        setInvoice(null);
      }
      setInventoryItems(inventoryData.items || []);
    } catch (error) {
      setError("We couldn't load this job card.");
      setErrorHint(getErrorHint(error, "Check your connection or try again.") || null);
    }
  }

  useEffect(() => {
    load();
  }, [params.jobCardId]);

  async function updateStatus(nextStatus: string) {
    setSaving(true);
    setError(null);
    setErrorHint(null);
    try {
      const data = await apiFetch<{ jobCard: JobCard }>(`/api/mech/jobs/${params.jobCardId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      setJobCard(data.jobCard);
      notify.success("Status updated", `Job card moved to ${data.jobCard.status}.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to update status.");
      setErrorHint(getErrorHint(error, "Try another valid status transition.") || null);
      notify.error(
        "Status update failed",
        error instanceof Error ? error.message : "Try again.",
        getErrorHint(error, "Use the next allowed workflow status."),
        isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveChecklist(nextChecklist: Checklist) {
    setSaving(true);
    setError(null);
    setErrorHint(null);
    try {
      const data = await apiFetch<{ jobCard: JobCard }>(`/api/mech/jobs/${params.jobCardId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: nextChecklist })
      });
      setJobCard(data.jobCard);
      notify.success("Checklist saved");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save checklist.");
      setErrorHint(getErrorHint(error, "Retry the checklist update.") || null);
      notify.error(
        "Checklist update failed",
        error instanceof Error ? error.message : "Try again.",
        getErrorHint(error, "Retry the checklist update."),
        isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
      );
    } finally {
      setSaving(false);
    }
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const data = await apiFetch<{ jobCard: JobCard }>(`/api/mech/jobs/${params.jobCardId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: noteText.trim() })
      });
      setJobCard(data.jobCard);
      setNoteText("");
      notify.success("Note added");
    } catch (error) {
      if (isApiClientError(error) && error.fields) setFieldErrors(error.fields);
      setError(error instanceof Error ? error.message : "Failed to add note.");
      notify.error(
        "Note could not be saved",
        error instanceof Error ? error.message : "Try again.",
        getErrorHint(error, "Write a short note and try again."),
        isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
      );
    } finally {
      setSaving(false);
    }
  }

  async function completeJob() {
    if (!customerName.trim()) {
      setFieldErrors({ customerName: "Customer name is required for sign-off." });
      setError("Customer name is required for sign-off.");
      return;
    }
    if (!approved) {
      setFieldErrors({ approved: "Customer approval is required to complete the job." });
      setError("Customer approval is required to complete the job.");
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const data = await apiFetch<{ jobCard: JobCard; invoice?: Invoice }>(`/api/mech/jobs/${params.jobCardId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          approved,
          summary: summary.trim() || undefined,
          partsUsed
        })
      });
      setJobCard(data.jobCard);
      if (data.invoice) {
        setInvoice(data.invoice);
      }
      notify.success("Job card completed", "The job is complete and the invoice is ready.");
    } catch (error) {
      if (isApiClientError(error) && error.fields) setFieldErrors(error.fields);
      setError(error instanceof Error ? error.message : "Failed to complete job card.");
      setErrorHint(getErrorHint(error, "Resolve any pending approvals and try again.") || null);
      notify.error(
        "Completion failed",
        error instanceof Error ? error.message : "Try again.",
        getErrorHint(error, "Resolve any pending approvals and try again."),
        isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
      );
    } finally {
      setSaving(false);
      setConfirmCompleteOpen(false);
    }
  }

  function stepComplete(step: (typeof workflowSteps)[number], checklist: Checklist) {
    return step.keys.every((key) => checklist[key]);
  }

  function firstIncompleteStepIndex(checklist: Checklist) {
    const index = workflowSteps.findIndex((step) => !stepComplete(step, checklist));
    return index === -1 ? workflowSteps.length : index;
  }

  async function completeWorkflowStep(stepIndex: number) {
    if (!jobCard || locked) return;
    const currentStep = firstIncompleteStepIndex(jobCard.checklist);
    if (stepIndex !== currentStep) {
      setError("Complete the current workflow step before moving forward.");
      notify.warning("Workflow step blocked", "Finish the current step before moving to the next one.");
      return;
    }

    const step = workflowSteps[stepIndex];
    const nextChecklist: Checklist = { ...jobCard.checklist };
    step.keys.forEach((key) => {
      nextChecklist[key] = true;
    });
    setJobCard({ ...jobCard, checklist: nextChecklist });
    await saveChecklist(nextChecklist);
  }

  function updatePart(index: number, field: keyof Part, value: string) {
    const next = partsUsed.map((part, idx) => {
      if (idx !== index) return part;
      if (field === "location") {
        return { ...part, location: value };
      }
      if (field === "qty") {
        const qty = Math.max(1, Number(value || 1));
        return { ...part, qty };
      }
      if (field === "unitPriceCents") {
        const price = value ? Math.round(Number(value) * 100) : undefined;
        return { ...part, unitPriceCents: price };
      }
      if (field === "brand") {
        return { ...part, brand: value };
      }
      return { ...part, name: value };
    });
    setPartsUsed(next);
  }

  function addPartRow() {
    const qty = Math.max(1, Number(partQty || 1));
    if (!partName.trim()) {
      setFieldErrors({ partName: "Select a part before adding." });
      setError("Select a part before adding.");
      return;
    }
    const part: Part = {
      inventoryItemId: inventoryItemId || undefined,
      location: partLocation,
      name: partName.trim(),
      brand: partBrand.trim() || undefined,
      qty,
      unitPriceCents: partPriceZar ? Math.round(Number(partPriceZar) * 100) : undefined
    };
    setPartsUsed((prev) => [...prev, part]);
    setPartName("");
    setInventoryItemId("");
    setPartBrand("");
    setPartQty("1");
    setPartPriceZar("");
    setFieldErrors((prev) => ({ ...prev, partName: "" }));
    notify.success("Part added", `${part.name} has been added to the job card.`);
  }

  async function addExtraCharge() {
    const amount = Math.round(Number(extraAmountZar) * 100);
    if (!extraName.trim() || !amount || amount < 1) {
      setFieldErrors({
        extraName: !extraName.trim() ? "Enter a charge name." : "",
        extraAmountZar: !amount || amount < 1 ? "Enter a valid amount." : ""
      });
      setError("Enter a valid extra name and amount.");
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const data = await apiFetch<{ jobCard: JobCard }>(`/api/mech/jobs/${params.jobCardId}/extras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: extraName.trim(),
          amountCents: amount,
          type: extraType
        })
      });
      setJobCard(data.jobCard);
      setAdditionalCharges(data.jobCard?.additionalCharges || []);
      setExtraName("");
      setExtraAmountZar("");
      notify.success("Extra added", "The extra has been sent for customer approval.");
    } catch (error) {
      if (isApiClientError(error) && error.fields) setFieldErrors(error.fields);
      setError(error instanceof Error ? error.message : "Failed to add extra charge.");
      notify.error(
        "Extra could not be added",
        error instanceof Error ? error.message : "Try again.",
        getErrorHint(error, "Review the extra details and try again."),
        isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
      );
    } finally {
      setSaving(false);
    }
  }

  if (!jobCard) {
    return (
      <div className="flex flex-col gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-foreground text-lg">Job card</h2>
          {error ? (
            <ErrorState title="Job card unavailable" message={error} hint={errorHint || undefined} onRetry={load} />
          ) : (
            <div className="flex flex-col gap-3 mt-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}
        </div>
      </div>
    );
  }

  const locked = Boolean(jobCard.completion?.completedAtIso) || jobCard.status === "COMPLETED";
  const workflowIndex = firstIncompleteStepIndex(jobCard.checklist);
  const workflowDone = workflowIndex >= workflowSteps.length;
  const currentLocationParts = PARTS_BY_LOCATION[partLocation] || [];
  const groupedParts = PART_LOCATIONS.map((location) => ({
    location,
    parts: partsUsed.filter((part) => (part.location || "Other") === location)
  })).filter((group) => group.parts.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Job card header */}
      <div className="bg-card rounded-xl border border-border p-5 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
          <h2 className="font-display font-bold text-foreground text-lg">Job card {jobCard.ref}</h2>
          <StatusBadge status={normalizeStatus(jobCard.status)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Booking ref:</span> <strong>{jobCard.bookingRef}</strong></div>
          <div><span className="text-muted-foreground">Service:</span> {jobCard.serviceName || "Service"}</div>
          <div><span className="text-muted-foreground">Customer:</span> {jobCard.customerName || ""} {jobCard.customerPhone ? `(${jobCard.customerPhone})` : ""}</div>
          <div><span className="text-muted-foreground">Slot:</span> {formatDateTimeZA(jobCard.slotIso)}</div>
          <div className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {jobCard.addressLine1}</div>
        </div>
      </div>

      {/* Status controls */}
      <div className="bg-card rounded-xl border border-border p-5 print:hidden">
        <h3 className="font-semibold text-foreground mb-3">Status</h3>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              variant={jobCard.status === option.value ? "default" : "outline"}
              size="sm"
              disabled={saving || locked}
              onClick={() => updateStatus(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Workflow steps */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-1">Workflow</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Complete each stage in order. Workflow progress updates the job readiness checks automatically.
        </p>
        <div className="flex flex-col gap-3">
          {workflowSteps.map((step, index) => {
            const done = stepComplete(step, jobCard.checklist);
            const active = !done && index === workflowIndex;
            const blocked = !done && index > workflowIndex;
            return (
              <div
                key={step.id}
                className={`rounded-lg border p-4 transition-colors ${
                  done
                    ? "border-status-completed/30 bg-status-completed/5"
                    : active
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/30 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <strong className="text-sm font-semibold">{step.title}</strong>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      done
                        ? "bg-status-completed/15 text-status-completed"
                        : active
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? "Done" : active ? "Current" : "Pending"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{step.detail}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {step.keys.map((key) => checklistFields.find((item) => item.key === key)?.label).filter(Boolean).join(" \u2022 ")}
                </p>
                <div className="mt-3 print:hidden">
                  <Button
                    className="w-full sm:w-auto min-h-[44px]"
                    variant="outline"
                    size="sm"
                    disabled={saving || locked || !active}
                    onClick={() => completeWorkflowStep(index)}
                  >
                    Mark step complete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-sm">
          <strong>Workflow status:</strong>{" "}
          <span className={workflowDone ? "text-status-completed font-medium" : "text-muted-foreground"}>
            {workflowDone ? "All workflow steps complete." : `On ${workflowSteps[workflowIndex]?.title}.`}
          </span>
        </div>
      </div>

      {/* Parts used */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-1">Parts used (by bike location)</h3>
        <p className="text-sm text-muted-foreground mb-4">Find parts by section of the bike and capture brand for invoice traceability.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 print:hidden">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Location</label>
            <select
              className={selectClass}
              value={partLocation}
              onChange={(event) => {
                const nextLocation = event.target.value;
                setPartLocation(nextLocation);
                setPartName("");
              }}
              disabled={locked}
            >
              {PART_LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Part</label>
            <select
              className={selectClass}
              value={inventoryItemId}
              onChange={(event) => {
                const selectedId = event.target.value;
                setInventoryItemId(selectedId);
                const selectedItem = inventoryItems.find((item) => item.id === selectedId);
                if (selectedItem) {
                  setPartName(selectedItem.name);
                  if (!partPriceZar) {
                    setPartPriceZar((selectedItem.unitPriceCents / 100).toFixed(2));
                  }
                }
              }}
              disabled={locked}
            >
              <option value="">Optional: choose inventory item</option>
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.category})
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={partName}
              onChange={(event) => setPartName(event.target.value)}
              disabled={locked}
            >
              <option value="">Select part</option>
              {currentLocationParts.map((part) => (
                <option key={part} value={part}>
                  {part}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Brand</label>
            <input
              className={inputFieldClass}
              value={partBrand}
              onChange={(event) => setPartBrand(event.target.value)}
              placeholder="Optional"
              list="part-brand-options"
              disabled={locked}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Qty</label>
            <input
              className={inputFieldClass}
              type="number"
              min={1}
              value={partQty}
              onChange={(event) => setPartQty(event.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Price (ZAR)</label>
            <input
              className={inputFieldClass}
              type="number"
              min={0}
              value={partPriceZar}
              onChange={(event) => setPartPriceZar(event.target.value)}
              placeholder="Optional"
              disabled={locked}
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full sm:w-auto min-h-[44px]" variant="outline" disabled={locked} onClick={addPartRow}>
              Add part
            </Button>
          </div>
          {fieldErrors.partName ? <p className="text-xs text-destructive sm:col-span-3">{fieldErrors.partName}</p> : null}
          <datalist id="part-brand-options">
            {COMMON_PART_BRANDS.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
        </div>

        {/* Parts table */}
        <div className="overflow-x-auto">
          <div className="hidden sm:grid grid-cols-5 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2 border-b border-border mb-2">
            <span>Location</span>
            <span>Part</span>
            <span>Brand</span>
            <span>Qty</span>
            <span>Price</span>
          </div>
          {partsUsed.length === 0 ? <p className="text-sm text-muted-foreground py-2">No parts added yet.</p> : null}
          {groupedParts.map((group) => (
            <div key={group.location} className="mb-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider py-1">{group.location}</div>
              {group.parts.map((part) => {
                const actualIndex = partsUsed.findIndex((p) => p === part);
                return (
                  <div key={`${part.name}-${actualIndex}`} className="grid grid-cols-1 sm:grid-cols-5 gap-2 py-2 border-b border-border/50 last:border-0">
                    <input
                      className={inputFieldClass}
                      value={part.location || ""}
                      onChange={(event) => updatePart(actualIndex, "location", event.target.value)}
                      disabled={locked}
                    />
                    <input
                      className={inputFieldClass}
                      value={part.name}
                      onChange={(event) => updatePart(actualIndex, "name", event.target.value)}
                      disabled={locked}
                    />
                    <input
                      className={inputFieldClass}
                      value={part.brand || ""}
                      onChange={(event) => updatePart(actualIndex, "brand", event.target.value)}
                      list="part-brand-options"
                      disabled={locked}
                      placeholder="Optional"
                    />
                    <input
                      className={inputFieldClass}
                      type="number"
                      min={1}
                      value={part.qty}
                      onChange={(event) => updatePart(actualIndex, "qty", event.target.value)}
                      disabled={locked}
                    />
                    <input
                      className={inputFieldClass}
                      type="number"
                      min={0}
                      value={part.unitPriceCents ? part.unitPriceCents / 100 : ""}
                      onChange={(event) => updatePart(actualIndex, "unitPriceCents", event.target.value)}
                      disabled={locked}
                      placeholder="Optional"
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Additional charges */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-3">Additional charges / consumables</h3>
        {additionalCharges.length === 0 ? <p className="text-sm text-muted-foreground">No additional charges yet.</p> : null}
        <div className="flex flex-col gap-2">
          {additionalCharges.map((charge) => (
            <div key={charge.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <strong className="text-sm">{charge.name}</strong>
                <div className="text-xs text-muted-foreground">{charge.type}</div>
                <div className="text-xs text-muted-foreground">Approval: {charge.approvalStatus || "APPROVED"}</div>
              </div>
              <strong className="text-sm whitespace-nowrap">{Math.round(charge.amountCents / 100)} ZAR</strong>
            </div>
          ))}
        </div>
        {!locked ? (
          <div className="mt-4 flex flex-col gap-3 print:hidden">
            <LabeledInput
              label="Charge name"
              value={extraName}
              onChange={(event) => setExtraName(event.target.value)}
              error={fieldErrors.extraName || null}
            />
            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium text-foreground">Amount (ZAR)</label>
                <input
                  className={inputFieldClass}
                  type="number"
                  min={1}
                  value={extraAmountZar}
                  onChange={(event) => setExtraAmountZar(event.target.value)}
                />
                {fieldErrors.extraAmountZar ? <span className="text-xs text-destructive">{fieldErrors.extraAmountZar}</span> : null}
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium text-foreground">Type</label>
                <select
                  className={selectClass}
                  value={extraType}
                  onChange={(event) =>
                    setExtraType(event.target.value === "CONSUMABLE" ? "CONSUMABLE" : "ADDITIONAL")
                  }
                >
                  <option value="ADDITIONAL">Additional</option>
                  <option value="CONSUMABLE">Consumable</option>
                </select>
              </div>
            </div>
            <Button className="w-full sm:w-auto min-h-[44px]" variant="outline" disabled={saving} onClick={addExtraCharge}>
              Add charge
            </Button>
          </div>
        ) : null}
      </div>

      {/* Notes */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-3">Notes</h3>
        <div className="flex flex-col gap-2">
          {jobCard.notes?.length ? (
            jobCard.notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-border p-3">
                <div className="text-sm">{note.text}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatDateTimeZA(note.atIso)}</div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2 print:hidden">
          <LabeledInput
            label="Add note"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            error={fieldErrors.text || null}
          />
          <Button className="w-full sm:w-auto min-h-[44px]" disabled={saving || !noteText.trim() || locked} onClick={addNote}>
            Add note
          </Button>
        </div>
      </div>

      {/* Completion sign-off */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-3">Completion sign-off</h3>
        {jobCard.completion?.completedAtIso ? (
          <div className="rounded-lg border border-status-completed/30 bg-status-completed/5 p-4">
            <p className="text-sm">
              Signed off by <strong>{jobCard.completion.customerSignoffName || ""}</strong>
            </p>
            <p className="text-sm">
              Approved: {jobCard.completion.customerSignoffAccepted ? "Yes" : "No"}
            </p>
            {jobCard.completion.summary ? <p className="text-sm mt-1">{jobCard.completion.summary}</p> : null}
            <p className="text-xs text-muted-foreground mt-2">{formatDateTimeZA(jobCard.completion.completedAtIso)}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 print:hidden">
            <LabeledInput
              label="Completion summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              helperText="Short description of work completed."
              error={fieldErrors.summary || null}
            />
            <LabeledInput
              label="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              error={fieldErrors.customerName || null}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={approved}
                onChange={(event) => setApproved(event.target.checked)}
                disabled={locked}
              />
              Customer approved the work
            </label>
            {fieldErrors.approved ? <p className="text-xs text-destructive">{fieldErrors.approved}</p> : null}
            <Button className="w-full sm:w-auto min-h-[44px]" disabled={saving || locked} onClick={() => setConfirmCompleteOpen(true)}>
              Complete job card and issue invoice
            </Button>
          </div>
        )}
      </div>

      {/* Invoice */}
      {invoice ? (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-3">Customer invoice</h3>
          <p className="text-sm">
            Invoice ref: <strong>{invoice.ref}</strong>
          </p>
          <p className="text-xs text-muted-foreground mb-3">Issued: {formatDateTimeZA(invoice.issuedAtIso)}</p>
          <div className="flex flex-col gap-2">
            {invoice.lineItems.map((line) => (
              <div key={line.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <span className="text-sm min-w-0 flex-1">{line.label}</span>
                <strong className="text-sm whitespace-nowrap">{Math.round(line.amountCents / 100)} ZAR</strong>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <strong className="text-sm">Total</strong>
            <strong className="text-lg">{Math.round(invoice.totalCents / 100)} ZAR</strong>
          </div>
          <div className="print:hidden mt-4">
            <Button className="w-full sm:w-auto min-h-[44px]" variant="outline" onClick={() => window.print()}>
              Print invoice
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {errorHint ? <p className="text-sm text-muted-foreground">{errorHint}</p> : null}

      <div className="print:hidden">
        <Button className="w-full sm:w-auto min-h-[44px]" variant="outline" onClick={() => window.print()}>
          Print job card
        </Button>
      </div>
      <ConfirmDialog
        open={confirmCompleteOpen}
        title="Complete job card?"
        message="This will mark the job as completed and issue the invoice. Make sure all checklist items and approvals are done."
        detail={jobCard.ref}
        confirmLabel="Complete job"
        cancelLabel="Not yet"
        variant="danger"
        loading={saving}
        onCancel={() => setConfirmCompleteOpen(false)}
        onConfirm={() => {
          void completeJob();
        }}
      />
    </div>
  );
}
