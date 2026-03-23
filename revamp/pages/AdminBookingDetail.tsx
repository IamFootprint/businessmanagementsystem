import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { WorkspaceShell } from "@/revamp/components/WorkspaceShell";
import { ADMIN_NAV_GROUPS } from "@/revamp/lib/navigation";
import { StatusBadge } from "@/revamp/components/StatusBadge";
import { Button } from "@/revamp/components/ui/button";
import { Input } from "@/revamp/components/ui/input";
import { Textarea } from "@/revamp/components/ui/textarea";
import { ArrowLeft, Phone, MapPin, Clock, Bike, User, FileText, UserCog } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { formatDateTimeLongZA } from "@/revamp/lib/formatters";

type Mechanic = {
  id: string;
  name?: string | null;
  phone: string;
  status: string;
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
  preferredMechanicId?: string | null;
  mechanics?: Mechanic[];
  jobCard?: {
    id: string;
    ref: string;
    status: string;
    assignedMechanicId?: string | null;
    assignedMechanicName?: string | null;
  } | null;
};

type TimelineStep = {
  label: string;
  done: boolean;
};

function timelineSteps(status: string, jobStatus?: string | null): TimelineStep[] {
  return [
    { label: "Booking created", done: true },
    { label: "Confirmed", done: status === "CONFIRMED" || status === "COMPLETED" || status === "CANCELLED" },
    { label: "En route", done: ["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_APPROVAL", "COMPLETED"].includes(jobStatus || "") },
    { label: "Arrived", done: ["ARRIVED", "IN_PROGRESS", "AWAITING_APPROVAL", "COMPLETED"].includes(jobStatus || "") },
    { label: "In progress", done: ["IN_PROGRESS", "AWAITING_APPROVAL", "COMPLETED"].includes(jobStatus || "") },
    { label: "Completed", done: status === "COMPLETED" || jobStatus === "COMPLETED" },
  ];
}

function toLocalDateTimeValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export default function AdminBookingDetail() {
  const { bookingId = "" } = useParams();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [slotLocal, setSlotLocal] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [selectedMechanicId, setSelectedMechanicId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function loadBooking() {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<BookingDetail>(`/api/admin/bookings/${bookingId}`);
      setBooking(data);
      setSlotLocal(toLocalDateTimeValue(data.scheduledStartAt));
      setSelectedMechanicId(data.jobCard?.assignedMechanicId || data.preferredMechanicId || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load booking details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  async function assignMechanic() {
    if (!booking?.jobCard) return;
    setAssigning(true);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/job-cards/${booking.jobCard.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mechanicId: selectedMechanicId || null }),
      });
      setMessage("Mechanic assignment updated.");
      await loadBooking();
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Unable to assign mechanic.");
    } finally {
      setAssigning(false);
    }
  }

  async function rescheduleBooking() {
    if (!slotLocal || !booking) return;
    setRescheduling(true);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/bookings/${booking.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotStart: new Date(slotLocal).toISOString() }),
      });
      setMessage("Booking rescheduled.");
      await loadBooking();
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Unable to reschedule booking.");
    } finally {
      setRescheduling(false);
    }
  }

  async function cancelBooking() {
    if (!booking) return;
    setCancelling(true);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });
      setMessage("Booking cancelled.");
      await loadBooking();
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Unable to cancel booking.");
    } finally {
      setCancelling(false);
    }
  }

  const timeline = useMemo(() => {
    if (!booking) return [];
    return timelineSteps(booking.status, booking.jobCard?.status);
  }, [booking]);

  if (loading) {
    return (
      <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Booking">
        <div className="panel-padded">
          <p className="text-sm text-muted-foreground">Loading booking details...</p>
        </div>
      </WorkspaceShell>
    );
  }

  if (error || !booking) {
    return (
      <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Booking">
        <div className="panel-padded">
          <p className="text-sm text-status-cancelled mb-3">{error || "Booking not found."}</p>
          <Button size="sm" variant="outline" onClick={() => void loadBooking()}>Retry</Button>
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title={`Booking ${booking.referenceCode}`}>
      <div className="stack-lg max-w-4xl">
        <Link to="/admin/bookings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Bookings
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-display font-bold text-foreground">{booking.referenceCode}</h1>
            <StatusBadge status={booking.jobCard?.status || booking.status} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/bookings"><FileText className="w-4 h-4" /> All Bookings</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 stack">
            <div className="panel-padded">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Service Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Bike className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{booking.itemName}</p>
                    <p className="text-xs text-muted-foreground">{booking.referenceCode}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{formatDateTimeLongZA(booking.scheduledStartAt)}</p>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:col-span-2">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{booking.addressText || "Address unavailable"}</p>
                    <p className="text-xs text-muted-foreground">Service location</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-padded">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Customer</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{booking.customerName}</p>
                  <p className="text-sm text-muted-foreground">{booking.customerPhone}</p>
                </div>
                <Button variant="outline" size="sm"><Phone className="w-4 h-4" /> Call</Button>
              </div>
            </div>

            <div className="panel-padded stack">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mechanic Assignment</p>
              {booking.jobCard ? (
                <>
                  <div className="flex items-center gap-3">
                    <UserCog className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-foreground">
                      {booking.jobCard.assignedMechanicName || "Unassigned"} · {booking.jobCard.ref}
                    </p>
                  </div>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedMechanicId}
                    onChange={(event) => setSelectedMechanicId(event.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {(booking.mechanics || []).map((mechanic) => (
                      <option key={mechanic.id} value={mechanic.id}>
                        {mechanic.name || mechanic.phone} ({mechanic.status})
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" disabled={assigning} onClick={() => void assignMechanic()}>
                    {assigning ? "Assigning..." : "Update Assignment"}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No job card has been created for this booking yet.</p>
              )}
            </div>

            <div className="panel-padded stack">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amend Booking</p>
              <Input type="datetime-local" value={slotLocal} onChange={(event) => setSlotLocal(event.target.value)} />
              <Button size="sm" variant="outline" disabled={rescheduling} onClick={() => void rescheduleBooking()}>
                {rescheduling ? "Rescheduling..." : "Reschedule"}
              </Button>
              <Textarea
                rows={3}
                placeholder="Cancellation reason (optional)"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
              />
              <Button size="sm" variant="destructive" disabled={cancelling} onClick={() => void cancelBooking()}>
                {cancelling ? "Cancelling..." : "Cancel Booking"}
              </Button>
            </div>

            {booking.notes ? (
              <div className="panel-padded">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-foreground">{booking.notes}</p>
              </div>
            ) : null}
          </div>

          <div className="stack">
            <div className="panel-padded">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Timeline</p>
              <div className="relative">
                {timeline.map((step, index) => (
                  <div key={step.label} className="flex gap-3 pb-5 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                        step.done ? "bg-primary border-primary" : "bg-card border-border"
                      }`}
                      />
                      {index < timeline.length - 1 ? (
                        <div className={`w-0.5 flex-1 mt-1 ${step.done ? "bg-primary/30" : "bg-border"}`} />
                      ) : null}
                    </div>
                    <div className="min-w-0 -mt-0.5">
                      <p className={`text-sm font-medium ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-padded">
              <p className="text-xs text-muted-foreground">Scheduled for</p>
              <p className="text-sm font-medium text-foreground">{formatDateTimeLongZA(booking.scheduledStartAt)}</p>
            </div>
          </div>
        </div>

        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </WorkspaceShell>
  );
}
