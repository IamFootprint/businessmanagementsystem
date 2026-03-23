"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import BookingStatusBadge from "@/app/components/BookingStatusBadge";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { formatDateTimeZA } from "@/lib/format/date";
type Booking = {
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
  jobCard?: {
    id: string;
    ref: string;
    status: string;
    assignedMechanicId?: string | null;
    assignedMechanicName?: string | null;
  } | null;
  mechanics?: Array<{ id: string; name?: string; phone: string; status: string }>;
};

const selectClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export default function AdminBookingDetailPage({ params }: { params: { id: string } }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [slotIso, setSlotIso] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>("");

  async function loadBooking() {
    setFetchError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${params.id}`);
      if (!res.ok) {
        setFetchError("Failed to load booking details.");
        return;
      }
      const raw = await res.json();
      const data = raw.data ?? raw;
      setBooking(data);
      setSlotIso(data.scheduledStartAt ? new Date(data.scheduledStartAt).toISOString().slice(0, 16) : "");
      setSelectedMechanicId(data?.jobCard?.assignedMechanicId || data?.preferredMechanicId || "");
    } catch {
      setFetchError("Network error loading booking.");
    }
  }

  useEffect(() => {
    void loadBooking();
  }, [params.id]);

  async function assignMechanic() {
    if (!booking?.jobCard) return;
    setAssigning(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/job-cards/${booking.jobCard.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mechanicId: selectedMechanicId || null })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || "Unable to assign mechanic.");
        return;
      }
      setMessage("Mechanic assignment updated.");
      await loadBooking();
    } catch {
      setMessage("Network error while assigning mechanic.");
    } finally {
      setAssigning(false);
    }
  }

  async function reschedule() {
    if (!slotIso || rescheduling) return;
    setRescheduling(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/bookings/${params.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotStart: new Date(slotIso).toISOString() })
      });
      const raw = await res.json();
      if (!res.ok) {
        setMessage(raw?.error?.message || "Unable to reschedule.");
        return;
      }
      const data = raw.data ?? raw;
      setMessage("Rescheduled.");
      setBooking((prev) => (prev ? { ...prev, scheduledStartAt: data.booking.slotIso } : prev));
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setRescheduling(false);
    }
  }

  async function doCancel() {
    setCancelConfirmOpen(false);
    setCancelling(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/bookings/${params.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const raw = await res.json();
      if (!res.ok) {
        setMessage(raw?.error?.message || "Unable to cancel.");
        return;
      }
      const data = raw.data ?? raw;
      setMessage("Cancelled.");
      setBooking((prev) => (prev ? { ...prev, status: data.booking.status } : prev));
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  if (fetchError) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <h1 className="font-display font-bold text-foreground text-lg mb-2">Booking details</h1>
        <p className="text-sm text-destructive">{fetchError}</p>
        <Button variant="outline" className="mt-3" onClick={loadBooking}>Retry</Button>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="h-6 w-1/2 rounded-md bg-muted animate-pulse mb-3" />
        <div className="h-4 w-3/5 rounded-md bg-muted animate-pulse mb-2" />
        <div className="h-4 w-2/5 rounded-md bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Booking</p>
            <h1 className="font-display font-bold text-foreground text-lg">{booking.referenceCode}</h1>
            <p className="text-sm text-muted-foreground">{booking.itemName}</p>
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>
        <div className="space-y-1.5 text-sm">
          <p><strong className="text-foreground">Customer:</strong> <span className="text-muted-foreground">{booking.customerName} ({booking.customerPhone})</span></p>
          <p><strong className="text-foreground">Slot:</strong> <span className="text-muted-foreground">{formatDateTimeZA(booking.scheduledStartAt)}</span></p>
          <p><strong className="text-foreground">Address:</strong> <span className="text-muted-foreground">{booking.addressText}</span></p>
          {booking.notes ? <p><strong className="text-foreground">Notes:</strong> <span className="text-muted-foreground">{booking.notes}</span></p> : null}
        </div>
      </div>

      {booking.jobCard ? (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between mb-3">
            <h2 className="font-display font-bold text-foreground">Job card</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{booking.jobCard.status}</span>
          </div>
          <p className="text-sm font-semibold text-foreground">{booking.jobCard.ref}</p>
          <p className="text-sm text-muted-foreground mb-3">Assigned mechanic: {booking.jobCard.assignedMechanicName || "Unassigned"}</p>
          <div className="flex items-end gap-3">
            <div className="min-w-[260px] space-y-1.5">
              <label className="text-sm font-medium text-foreground">Mechanic</label>
              <select className={selectClass} value={selectedMechanicId} onChange={(event) => setSelectedMechanicId(event.target.value)}>
                <option value="">Unassigned</option>
                {(booking.mechanics || [])
                  .filter((mechanic) => mechanic.status === "ACTIVE")
                  .map((mechanic) => (
                    <option key={mechanic.id} value={mechanic.id}>
                      {mechanic.name || mechanic.phone}
                    </option>
                  ))}
              </select>
            </div>
            <Button onClick={assignMechanic} disabled={assigning}>{assigning ? "Updating..." : "Save assignment"}</Button>
          </div>
        </div>
      ) : null}

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-foreground mb-3">Reschedule</h2>
        <LabeledInput label="New slot" type="datetime-local" value={slotIso} onChange={(e) => setSlotIso(e.target.value)} />
        <div className="mt-3">
          <Button onClick={reschedule} disabled={rescheduling || !slotIso}>{rescheduling ? "Rescheduling..." : "Reschedule"}</Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-foreground mb-3">Cancel booking</h2>
        <LabeledInput label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="mt-3">
          <Button variant="outline" onClick={() => setCancelConfirmOpen(true)} disabled={cancelling}>
            {cancelling ? "Cancelling..." : "Cancel booking"}
          </Button>
        </div>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Cancel booking"
        message="Are you sure you want to cancel this booking? This action cannot be undone."
        detail={`Ref: ${booking.referenceCode} | ${booking.customerName} | ${formatDateTimeZA(booking.scheduledStartAt)}`}
        confirmLabel="Cancel booking"
        variant="danger"
        loading={cancelling}
        onConfirm={doCancel}
        onCancel={() => setCancelConfirmOpen(false)}
      />
    </div>
  );
}
