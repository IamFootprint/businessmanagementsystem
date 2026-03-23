import { useEffect, useMemo, useState } from "react";
import { WorkspaceShell } from "@/revamp/components/WorkspaceShell";
import { MECH_NAV_GROUPS } from "@/revamp/lib/navigation";
import { StatusBadge } from "@/revamp/components/StatusBadge";
import { Button } from "@/revamp/components/ui/button";
import { Input } from "@/revamp/components/ui/input";
import { Textarea } from "@/revamp/components/ui/textarea";
import { MapPin, Phone, Navigation, Camera, MessageSquare, CheckCircle2, ArrowRight, Plus, Wrench, X } from "lucide-react";
import { useToast } from "@/revamp/hooks/use-toast";
import { apiFetch } from "@/lib/client/api";
import { formatDateTimeLongZA, formatZarFromCents } from "@/revamp/lib/formatters";
import { useParams } from "react-router-dom";

type JobStatus = "SCHEDULED" | "EN_ROUTE" | "ARRIVED" | "IN_PROGRESS" | "AWAITING_APPROVAL" | "COMPLETED" | "CANCELLED";

type JobPart = {
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

type JobCard = {
  id: string;
  ref: string;
  bookingRef: string;
  serviceName?: string;
  addressLine1: string;
  slotIso: string;
  status: JobStatus;
  customerName?: string;
  customerPhone?: string;
  notes: Array<{ id: string; atIso: string; text: string }>;
  partsUsed: JobPart[];
  additionalCharges?: AdditionalCharge[];
  completion?: {
    completedAtIso?: string;
    customerSignoffName?: string;
    customerSignoffAccepted?: boolean;
    summary?: string;
  };
};

type Invoice = {
  id: string;
  ref: string;
  issuedAtIso: string;
  totalCents: number;
};

const statusFlow: Array<{ status: JobStatus; label: string; action: string; next?: JobStatus }> = [
  { status: "SCHEDULED", label: "Scheduled", action: "Start Route", next: "EN_ROUTE" },
  { status: "EN_ROUTE", label: "En Route", action: "Mark Arrived", next: "ARRIVED" },
  { status: "ARRIVED", label: "Arrived", action: "Start Work", next: "IN_PROGRESS" },
  { status: "IN_PROGRESS", label: "In Progress", action: "Complete Job" },
  { status: "AWAITING_APPROVAL", label: "Awaiting Approval", action: "Waiting for Customer" },
  { status: "COMPLETED", label: "Completed", action: "Done" },
];

export default function MechanicJobDetail() {
  const { jobCardId = "" } = useParams();
  const { toast } = useToast();
  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showParts, setShowParts] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [parts, setParts] = useState<JobPart[]>([]);
  const [newPartName, setNewPartName] = useState("");
  const [newPartQty, setNewPartQty] = useState("1");
  const [newPartPrice, setNewPartPrice] = useState("");
  const [extraName, setExtraName] = useState("");
  const [extraAmount, setExtraAmount] = useState("");
  const [extraSaving, setExtraSaving] = useState(false);
  const [summary, setSummary] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [approved, setApproved] = useState(false);
  const [completing, setCompleting] = useState(false);

  async function loadJob() {
    if (!jobCardId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ jobCard: JobCard }>(`/api/mech/jobs/${jobCardId}`);
      setJobCard(data.jobCard);
      setParts(data.jobCard.partsUsed || []);
      setCustomerName(data.jobCard.customerName || "");

      const invoiceResponse = await fetch(`/api/mech/jobs/${jobCardId}/invoice`, { cache: "no-store" });
      const invoicePayload = await invoiceResponse.json().catch(() => ({}));
      if (invoiceResponse.ok) {
        setInvoice(invoicePayload.invoice || null);
      } else {
        setInvoice(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load job card.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCardId]);

  async function updateStatus(nextStatus: JobStatus) {
    if (!jobCard) return;
    setStatusSaving(true);
    setMessage(null);
    try {
      const data = await apiFetch<{ jobCard: JobCard }>(`/api/mech/jobs/${jobCard.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      setJobCard(data.jobCard);
      setMessage(`Status updated to ${data.jobCard.status.replace(/_/g, " ")}.`);
    } catch (requestError) {
      const nextMessage = requestError instanceof Error ? requestError.message : "Unable to update status.";
      setMessage(nextMessage);
      toast({ title: "Status update failed", description: nextMessage });
    } finally {
      setStatusSaving(false);
    }
  }

  async function saveNote() {
    if (!jobCard || !noteText.trim()) return;
    try {
      const data = await apiFetch<{ jobCard: JobCard }>(`/api/mech/jobs/${jobCard.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: noteText.trim() }),
      });
      setJobCard(data.jobCard);
      setNoteText("");
      toast({ title: "Notes saved" });
    } catch (requestError) {
      const nextMessage = requestError instanceof Error ? requestError.message : "Unable to save notes.";
      toast({ title: "Note save failed", description: nextMessage });
    }
  }

  function addPart() {
    if (!newPartName.trim()) return;
    const qty = Math.max(1, Number(newPartQty || 1));
    const price = Number(newPartPrice);
    setParts((prev) => [
      ...prev,
      {
        name: newPartName.trim(),
        qty,
        unitPriceCents: Number.isFinite(price) && price > 0 ? Math.round(price * 100) : undefined,
      },
    ]);
    setNewPartName("");
    setNewPartQty("1");
    setNewPartPrice("");
    toast({ title: "Part added" });
  }

  function removePart(index: number) {
    setParts((prev) => prev.filter((_, partIndex) => partIndex !== index));
  }

  async function addExtra() {
    if (!jobCard) return;
    const amountCents = Math.round(Number(extraAmount) * 100);
    if (!extraName.trim() || !amountCents || amountCents < 1) {
      toast({ title: "Invalid extra", description: "Enter a valid charge name and amount." });
      return;
    }
    setExtraSaving(true);
    try {
      const data = await apiFetch<{ jobCard: JobCard }>(`/api/mech/jobs/${jobCard.id}/extras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: extraName.trim(),
          amountCents,
          type: "ADDITIONAL",
        }),
      });
      setJobCard(data.jobCard);
      setExtraName("");
      setExtraAmount("");
      toast({ title: "Extra added", description: "Customer approval is required before completion." });
    } catch (requestError) {
      const nextMessage = requestError instanceof Error ? requestError.message : "Unable to add extra.";
      toast({ title: "Extra failed", description: nextMessage });
    } finally {
      setExtraSaving(false);
    }
  }

  async function completeJob() {
    if (!jobCard) return;
    if (!customerName.trim() || !approved) {
      toast({ title: "Sign-off required", description: "Capture customer name and approval before completion." });
      return;
    }
    setCompleting(true);
    try {
      const data = await apiFetch<{ jobCard: JobCard; invoice?: Invoice }>(`/api/mech/jobs/${jobCard.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          approved,
          summary: summary.trim() || undefined,
          partsUsed: parts,
        }),
      });
      setJobCard(data.jobCard);
      if (data.invoice) setInvoice(data.invoice);
      toast({ title: "Job completed", description: "Invoice has been issued." });
    } catch (requestError) {
      const nextMessage = requestError instanceof Error ? requestError.message : "Unable to complete job.";
      toast({ title: "Completion failed", description: nextMessage });
    } finally {
      setCompleting(false);
    }
  }

  const currentIndex = useMemo(() => {
    if (!jobCard) return 0;
    const index = statusFlow.findIndex((step) => step.status === jobCard.status);
    return index >= 0 ? index : 0;
  }, [jobCard]);

  const currentStatus = statusFlow[currentIndex];
  const pendingExtras = (jobCard?.additionalCharges || []).filter((extra) => extra.approvalStatus === "PENDING");
  const isComplete = jobCard?.status === "COMPLETED";
  const canTransition = Boolean(currentStatus?.next) && !isComplete;

  if (loading) {
    return (
      <WorkspaceShell navGroups={MECH_NAV_GROUPS} title="Job Detail">
        <div className="panel-padded">
          <p className="text-sm text-muted-foreground">Loading job card...</p>
        </div>
      </WorkspaceShell>
    );
  }

  if (error || !jobCard) {
    return (
      <WorkspaceShell navGroups={MECH_NAV_GROUPS} title="Job Detail">
        <div className="panel-padded">
          <p className="text-sm text-status-cancelled mb-3">{error || "Job card not found."}</p>
          <Button size="sm" variant="outline" onClick={() => void loadJob()}>Retry</Button>
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell navGroups={MECH_NAV_GROUPS} title="Job Detail">
      <div className="stack-lg max-w-2xl">
        <div className="panel-padded">
          <div className="flex items-center gap-1 mb-4">
            {statusFlow.map((step, index) => (
              <div key={step.status} className="flex items-center gap-1 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  index < currentIndex ? "bg-status-completed text-primary-foreground"
                    : index === currentIndex ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
                >
                  {index < currentIndex ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[10px] font-bold">{index + 1}</span>}
                </div>
                {index < statusFlow.length - 1 ? (
                  <div className={`flex-1 h-0.5 rounded-full ${index < currentIndex ? "bg-status-completed" : "bg-muted"}`} />
                ) : null}
              </div>
            ))}
          </div>
          <p className="text-sm font-medium text-muted-foreground">Current: <span className="text-foreground font-semibold">{currentStatus.label}</span></p>
          <p className="text-xs text-muted-foreground mt-1">{jobCard.ref} · {formatDateTimeLongZA(jobCard.slotIso)}</p>
        </div>

        <div className="panel">
          <div className="p-5 flex items-start justify-between border-b border-border">
            <div>
              <p className="font-bold text-foreground text-lg">{jobCard.serviceName || "Service"}</p>
              <p className="text-sm text-muted-foreground">{jobCard.bookingRef} · {jobCard.ref}</p>
            </div>
            <StatusBadge status={jobCard.status} />
          </div>
          <div className="p-5 border-b border-border">
            <p className="text-sm font-semibold text-foreground">{jobCard.customerName || "Customer"}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{jobCard.addressLine1 || "Address unavailable"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Phone className="w-3.5 h-3.5" />
              <span>{jobCard.customerPhone || "No phone provided"}</span>
            </div>
          </div>
          <div className="p-5 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1"><Navigation className="w-4 h-4" /> Navigate</Button>
            <Button variant="outline" size="sm" className="flex-1"><Phone className="w-4 h-4" /> Call</Button>
          </div>
        </div>

        {!isComplete ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => toast({ title: "Photo upload", description: "Photo capture will be available soon." })}
                className="panel-padded flex flex-col items-center gap-2 hover:bg-muted/30 transition-colors"
              >
                <Camera className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Photos</span>
              </button>
              <button
                onClick={() => setShowNotes((current) => !current)}
                className="panel-padded flex flex-col items-center gap-2 hover:bg-muted/30 transition-colors"
              >
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Notes</span>
              </button>
              <button
                onClick={() => setShowParts((current) => !current)}
                className="panel-padded flex flex-col items-center gap-2 hover:bg-muted/30 transition-colors"
              >
                <Wrench className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Parts</span>
              </button>
            </div>

            {showNotes ? (
              <div className="panel-padded stack">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Job Notes</p>
                <Textarea
                  placeholder="Add notes about the job, bike condition, customer requests..."
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  rows={4}
                />
                <Button size="sm" onClick={() => void saveNote()} disabled={!noteText.trim()}>
                  Save Notes
                </Button>
                {(jobCard.notes || []).map((note) => (
                  <div key={note.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm text-foreground">{note.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTimeLongZA(note.atIso)}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {showParts ? (
              <div className="panel-padded stack">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Parts Used</p>
                {parts.length > 0 ? (
                  <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                    {parts.map((part, index) => (
                      <div key={`${part.name}-${index}`} className="flex items-center justify-between p-3 bg-card">
                        <div>
                          <p className="text-sm font-medium text-foreground">{part.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {part.qty} · {formatZarFromCents(part.unitPriceCents)}
                          </p>
                        </div>
                        <button onClick={() => removePart(index)} className="p-1 rounded hover:bg-muted">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No parts captured yet.</p>
                )}
                <div className="grid grid-cols-[1fr_60px_80px_auto] gap-2 items-end">
                  <div>
                    <label className="text-xs text-muted-foreground">Part</label>
                    <Input
                      placeholder="Part name"
                      value={newPartName}
                      onChange={(event) => setNewPartName(event.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Qty</label>
                    <Input
                      type="number"
                      value={newPartQty}
                      onChange={(event) => setNewPartQty(event.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Price</label>
                    <Input
                      placeholder="R 0"
                      value={newPartPrice}
                      onChange={(event) => setNewPartPrice(event.target.value)}
                      className="h-9"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={addPart} className="h-9">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="panel-padded stack">
              <button
                onClick={() => setShowExtras((current) => !current)}
                className="flex items-center justify-between text-left"
                type="button"
              >
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Additional Charges</p>
                <span className="text-xs text-muted-foreground">{jobCard.additionalCharges?.length || 0}</span>
              </button>
              {showExtras ? (
                <>
                  {(jobCard.additionalCharges || []).map((charge) => (
                    <div key={charge.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{charge.name}</p>
                        <StatusBadge status={charge.approvalStatus || "approved"} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{formatZarFromCents(charge.amountCents)} · {charge.type}</p>
                    </div>
                  ))}
                  <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
                    <div>
                      <label className="text-xs text-muted-foreground">Charge</label>
                      <Input value={extraName} onChange={(event) => setExtraName(event.target.value)} placeholder="Charge name" className="h-9" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Amount</label>
                      <Input value={extraAmount} onChange={(event) => setExtraAmount(event.target.value)} placeholder="0" className="h-9" />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => void addExtra()} className="h-9" disabled={extraSaving}>
                      {extraSaving ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </>
              ) : null}
            </div>

            {jobCard.status === "AWAITING_APPROVAL" && pendingExtras.length > 0 ? (
              <div className="panel-padded border-status-pending/30 bg-status-pending/10">
                <p className="text-sm text-foreground">Waiting for customer approval on {pendingExtras.length} extra item(s).</p>
              </div>
            ) : null}

            {(jobCard.status === "IN_PROGRESS" || jobCard.status === "AWAITING_APPROVAL") ? (
              <div className="panel-padded stack">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completion Sign-Off</p>
                <Input
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                />
                <Textarea
                  placeholder="Completion summary"
                  rows={3}
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                />
                <label className="text-sm text-foreground flex items-center gap-2">
                  <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
                  Customer approved the work
                </label>
                <Button size="lg" className="w-full" onClick={() => void completeJob()} disabled={completing}>
                  {completing ? "Completing..." : "Complete Job"}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-status-completed/15 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-status-completed" />
            </div>
            <h2 className="font-display font-bold text-lg text-foreground">Job Complete</h2>
            <p className="text-sm text-muted-foreground mt-1">The invoice has been issued to the customer.</p>
            {invoice ? (
              <div className="panel-padded mt-4 text-left max-w-sm mx-auto">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Invoice Summary</p>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-foreground">{invoice.ref}</span>
                  <span className="text-muted-foreground">{formatZarFromCents(invoice.totalCents)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{formatDateTimeLongZA(invoice.issuedAtIso)}</p>
              </div>
            ) : null}
          </div>
        )}

        {canTransition ? (
          <Button
            size="lg"
            className="w-full"
            onClick={() => currentStatus.next ? void updateStatus(currentStatus.next) : undefined}
            disabled={statusSaving}
          >
            {statusSaving ? "Updating..." : `${currentStatus.action}`} <ArrowRight className="w-4 h-4" />
          </Button>
        ) : null}

        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </WorkspaceShell>
  );
}
