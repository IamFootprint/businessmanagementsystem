import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CustomerShell } from "@/revamp/components/CustomerShell";
import { StatusBadge } from "@/revamp/components/StatusBadge";
import { Button } from "@/revamp/components/ui/button";
import { Input } from "@/revamp/components/ui/input";
import { Textarea } from "@/revamp/components/ui/textarea";
import { Calendar, MapPin, FileText, MessageSquare, CheckCircle2, Hash } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { formatDateTimeLongZA, formatZarFromCents } from "@/revamp/lib/formatters";

type PendingExtra = {
  id: string;
  name: string;
  amountCents: number;
  type: string;
  approvalStatus?: string;
};

type BookingDetail = {
  id: string;
  referenceCode: string;
  customerName: string;
  customerPhone: string;
  addressText: string;
  notes?: string | null;
  status: string;
  itemName: string;
  scheduledStartAt: string;
  jobCard?: {
    id: string;
    ref: string;
    status: string;
  } | null;
  pendingExtras?: PendingExtra[];
  pricingSnapshot?: {
    totalCents?: number;
  };
};

type Rating = {
  id: string;
  rating: number;
  comment?: string;
};

type TimelineStep = {
  label: string;
  done: boolean;
};

function isJobStarted(jobStatus?: string | null) {
  if (!jobStatus) return false;
  return ["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_APPROVAL", "COMPLETED"].includes(jobStatus);
}

function timelineSteps(bookingStatus: string, jobStatus?: string | null): TimelineStep[] {
  const isConfirmed = bookingStatus === "CONFIRMED" || bookingStatus === "COMPLETED";
  return [
    { label: "Booking created", done: true },
    { label: "Confirmed by workshop", done: isConfirmed },
    { label: "Mechanic en route", done: ["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_APPROVAL", "COMPLETED"].includes(jobStatus || "") },
    { label: "Mechanic arrived", done: ["ARRIVED", "IN_PROGRESS", "AWAITING_APPROVAL", "COMPLETED"].includes(jobStatus || "") },
    { label: "Service in progress", done: ["IN_PROGRESS", "AWAITING_APPROVAL", "COMPLETED"].includes(jobStatus || "") },
    { label: "Service completed", done: bookingStatus === "COMPLETED" || jobStatus === "COMPLETED" },
  ];
}

function toLocalDateTimeValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function StarInput({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="w-9 h-9 rounded-md border border-input hover:bg-muted transition-colors text-lg"
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
        >
          {star <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value }: { value: number }) {
  return (
    <p className="text-xl" aria-label={`${value} stars`}>
      {[1, 2, 3, 4, 5].map((star) => (star <= value ? "★" : "☆")).join("")}
    </p>
  );
}

export default function CustomerBookingDetail() {
  const { bookingId = "" } = useParams();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [slotLocal, setSlotLocal] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [busyAction, setBusyAction] = useState<"reschedule" | "cancel" | null>(null);
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingMessage, setRatingMessage] = useState<string | null>(null);

  async function loadBooking() {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<BookingDetail>(`/api/public/bookings/${bookingId}`);
      setBooking(data);
      setSlotLocal(toLocalDateTimeValue(data.scheduledStartAt));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load booking details.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRating() {
    if (!bookingId) return;
    try {
      const data = await apiFetch<{ rating: Rating | null }>(`/api/app/bookings/${bookingId}/rate`);
      setExistingRating(data.rating || null);
    } catch {
      setExistingRating(null);
    }
  }

  useEffect(() => {
    void loadBooking();
    void loadRating();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  async function decideExtra(chargeId: string, action: "approve" | "reject") {
    setActionMessage(null);
    try {
      await apiFetch(`/api/app/bookings/${bookingId}/extras/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId }),
      });
      setActionMessage(action === "approve" ? "Extra approved." : "Extra rejected.");
      await loadBooking();
    } catch (requestError) {
      setActionMessage(requestError instanceof Error ? requestError.message : "Unable to update extra.");
    }
  }

  async function reschedule() {
    if (!slotLocal) return;
    setBusyAction("reschedule");
    setActionMessage(null);
    try {
      await apiFetch(`/api/public/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotIso: new Date(slotLocal).toISOString() }),
      });
      setActionMessage("Booking rescheduled.");
      await loadBooking();
    } catch (requestError) {
      setActionMessage(requestError instanceof Error ? requestError.message : "Unable to reschedule booking.");
    } finally {
      setBusyAction(null);
    }
  }

  async function cancelBooking() {
    setBusyAction("cancel");
    setActionMessage(null);
    try {
      await apiFetch(`/api/public/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });
      setActionMessage("Booking cancelled.");
      await loadBooking();
    } catch (requestError) {
      setActionMessage(requestError instanceof Error ? requestError.message : "Unable to cancel booking.");
    } finally {
      setBusyAction(null);
    }
  }

  async function submitRating() {
    if (ratingValue < 1) return;
    setRatingBusy(true);
    setRatingMessage(null);
    try {
      const data = await apiFetch<{ rating: Rating }>(`/api/app/bookings/${bookingId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: ratingValue,
          comment: ratingComment.trim() || undefined,
        }),
      });
      setExistingRating(data.rating);
      setRatingMessage("Thanks for your feedback.");
    } catch (requestError) {
      setRatingMessage(requestError instanceof Error ? requestError.message : "Unable to submit rating.");
    } finally {
      setRatingBusy(false);
    }
  }

  const timeline = useMemo(() => {
    if (!booking) return [];
    return timelineSteps(booking.status, booking.jobCard?.status);
  }, [booking]);

  if (loading) {
    return (
      <CustomerShell title="Booking">
        <div className="panel-padded">
          <p className="text-sm text-muted-foreground">Loading booking details...</p>
        </div>
      </CustomerShell>
    );
  }

  if (error || !booking) {
    return (
      <CustomerShell title="Booking">
        <div className="panel-padded">
          <p className="text-sm text-status-cancelled mb-3">{error || "Booking not found."}</p>
          <Button size="sm" variant="outline" onClick={() => void loadBooking()}>Retry</Button>
        </div>
      </CustomerShell>
    );
  }

  const isCompleted = booking.status === "COMPLETED";
  const isCancelled = booking.status === "CANCELLED";
  const canAmend = booking.status === "CONFIRMED" && !isJobStarted(booking.jobCard?.status);
  const pendingExtras = (booking.pendingExtras || []).filter((extra) => extra.approvalStatus === "PENDING");
  const displayStatus = booking.jobCard?.status || booking.status;

  return (
    <CustomerShell title={`Booking ${booking.referenceCode}`}>
      <div className="stack-lg">
        <div className="panel-padded">
          <div className="flex items-start justify-between mb-3 gap-3">
            <div>
              <p className="font-bold text-foreground text-lg">{booking.itemName}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{booking.referenceCode}</p>
            </div>
            <StatusBadge status={displayStatus} />
          </div>
          <p className="text-xl font-bold text-primary">{formatZarFromCents(booking.pricingSnapshot?.totalCents)}</p>
        </div>

        <div className="panel divide-y divide-border">
          {[
            { icon: Calendar, label: "Date & Time", value: formatDateTimeLongZA(booking.scheduledStartAt) },
            { icon: MapPin, label: "Location", value: booking.addressText || "Address unavailable" },
            { icon: Hash, label: "Reference", value: booking.referenceCode },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-4">
              <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="panel-padded">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Workshop Progress</p>
          {booking.jobCard ? (
            <>
              <p className="font-semibold text-foreground">{booking.jobCard.ref}</p>
              <p className="text-sm text-muted-foreground">{booking.jobCard.status.replace(/_/g, " ")}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No mechanic assigned yet.</p>
          )}
        </div>

        <div className="panel-padded">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Progress</p>
          <div className="space-y-0">
            {timeline.map((step, i) => (
              <div key={step.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      step.done ? "bg-status-completed text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                  </div>
                  {i < timeline.length - 1 && (
                    <div className={`w-0.5 h-6 ${step.done ? "bg-status-completed" : "bg-muted"}`} />
                  )}
                </div>
                <div className="pb-4">
                  <p className={`text-sm font-medium ${step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {pendingExtras.length > 0 ? (
          <div className="panel-padded">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Extras Awaiting Approval</p>
            <div className="stack-sm">
              {pendingExtras.map((extra) => (
                <div key={extra.id} className="rounded-lg border border-border p-3">
                  <p className="font-semibold text-foreground">{extra.name}</p>
                  <p className="text-sm text-muted-foreground">{formatZarFromCents(extra.amountCents)} · {extra.type}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => void decideExtra(extra.id, "reject")}>Reject</Button>
                    <Button size="sm" onClick={() => void decideExtra(extra.id, "approve")}>Approve</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!isCompleted && !isCancelled && canAmend ? (
          <div className="panel-padded stack">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Manage Booking</p>
            <Input type="datetime-local" value={slotLocal} onChange={(event) => setSlotLocal(event.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={busyAction === "reschedule"} onClick={() => void reschedule()}>
                {busyAction === "reschedule" ? "Rescheduling..." : "Reschedule"}
              </Button>
              <Button size="sm" variant="destructive" disabled={busyAction === "cancel"} onClick={() => void cancelBooking()}>
                {busyAction === "cancel" ? "Cancelling..." : "Cancel"}
              </Button>
            </div>
            <Textarea
              placeholder="Cancellation reason (optional)"
              rows={3}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </div>
        ) : null}

        {!isCompleted && !isCancelled && !canAmend ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">
              Online amendments are unavailable because this job is already underway.
            </p>
          </div>
        ) : null}

        {isCompleted ? (
          <div className="panel-padded">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Rate Your Service</p>
            {existingRating ? (
              <>
                <StarDisplay value={existingRating.rating} />
                {existingRating.comment ? <p className="text-sm text-muted-foreground mt-2">{existingRating.comment}</p> : null}
              </>
            ) : (
              <div className="stack-sm">
                <StarInput value={ratingValue} onChange={setRatingValue} />
                <Textarea
                  rows={3}
                  placeholder="Optional comment"
                  value={ratingComment}
                  onChange={(event) => setRatingComment(event.target.value)}
                />
                <Button size="sm" disabled={ratingBusy || ratingValue < 1} onClick={() => void submitRating()}>
                  {ratingBusy ? "Submitting..." : "Submit Rating"}
                </Button>
                {ratingMessage ? <p className="text-sm text-muted-foreground">{ratingMessage}</p> : null}
              </div>
            )}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" asChild>
            <Link to="/app/invoices"><FileText className="w-4 h-4" /> View Invoices</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/app/support"><MessageSquare className="w-4 h-4" /> Get Help</Link>
          </Button>
        </div>

        {booking.notes ? (
          <div className="panel-padded">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-foreground">{booking.notes}</p>
          </div>
        ) : null}

        {actionMessage ? <p className="text-sm text-muted-foreground">{actionMessage}</p> : null}
      </div>
    </CustomerShell>
  );
}
