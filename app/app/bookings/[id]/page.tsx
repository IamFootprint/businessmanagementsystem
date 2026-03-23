"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import BookingStatusBadge from "@/app/components/BookingStatusBadge";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import ErrorState from "@/app/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotify } from "@/app/components/ToastProvider";
import { apiFetch, getErrorHint, isApiClientError } from "@/lib/client/api";
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
  jobCard?: {
    id: string;
    ref: string;
    status: string;
  } | null;
  pendingExtras?: Array<{
    id: string;
    name: string;
    amountCents: number;
    type: string;
    approvalStatus?: string;
  }>;
};

type Rating = {
  id: string;
  rating: number;
  comment?: string;
};

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-3xl transition-colors"
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
        >
          <span className={star <= value ? "text-accent" : "text-muted-foreground/30"}>
            {star <= value ? "\u2605" : "\u2606"}
          </span>
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value }: { value: number }) {
  return (
    <span className="text-xl tracking-wider">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= value ? "text-accent" : "text-muted-foreground/30"}>
          {star <= value ? "\u2605" : "\u2606"}
        </span>
      ))}
    </span>
  );
}

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const notify = useNotify();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchHint, setFetchHint] = useState<string | null>(null);
  const [slotIso, setSlotIso] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  // Rating state
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingMessage, setRatingMessage] = useState<string | null>(null);

  async function loadBooking() {
    setFetchError(null);
    setFetchHint(null);
    try {
      const data = await apiFetch<Booking>(`/api/public/bookings/${params.id}`);
      setBooking(data);
      setSlotIso(data.scheduledStartAt ? new Date(data.scheduledStartAt).toISOString().slice(0, 16) : "");
    } catch (error) {
      setFetchError("We couldn't load this booking.");
      setFetchHint(getErrorHint(error, "Check your connection or try again.") || null);
    }
  }

  async function decideExtra(chargeId: string, action: "approve" | "reject") {
    if (!booking) return;
    setMessage(null);
    try {
      await apiFetch(`/api/app/bookings/${booking.id}/extras/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId })
      });
      setMessage(action === "approve" ? "Extra approved." : "Extra rejected.");
      notify.success(
        action === "approve" ? "Extra approved" : "Extra rejected",
        "The workshop has been updated."
      );
      await loadBooking();
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Unable to update extra approval.";
      setMessage(nextMessage);
      notify.error(
        "Extra decision failed",
        nextMessage,
        getErrorHint(error, "Try again."),
        isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
      );
    }
  }

  async function loadRating() {
    try {
      const res = await fetch(`/api/app/bookings/${params.id}/rate`);
      if (res.ok) {
        const raw = await res.json();
        const data = raw.data ?? raw;
        if (data.rating) setExistingRating(data.rating);
      }
    } catch {
      // Rating fetch is non-critical
    }
  }

  useEffect(() => {
    loadBooking();
    loadRating();
  }, [params.id]);

  async function reschedule() {
    if (!slotIso || rescheduling) return;
    setRescheduling(true);
    setMessage(null);
    setFieldErrors({});
    try {
      const data = await apiFetch<{ booking: { slotIso: string } }>(`/api/public/bookings/${params.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotIso: new Date(slotIso).toISOString() })
      });
      setMessage("Rescheduled.");
      setBooking((prev) => (prev ? { ...prev, scheduledStartAt: data.booking.slotIso } : prev));
      notify.success("Booking rescheduled", "The new slot has been saved.");
    } catch (error) {
      if (isApiClientError(error) && error.fields) {
        setFieldErrors(error.fields);
      }
      const nextMessage = error instanceof Error ? error.message : "Unable to reschedule.";
      setMessage(nextMessage);
      notify.error(
        "Reschedule failed",
        nextMessage,
        getErrorHint(error, "Choose another slot or contact the shop."),
        isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
      );
    } finally {
      setRescheduling(false);
    }
  }

  async function cancel() {
    if (cancelling) return;
    setCancelling(true);
    setMessage(null);
    setFieldErrors({});
    try {
      const data = await apiFetch<{ booking: { status: string } }>(`/api/public/bookings/${params.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      setMessage("Cancelled.");
      setBooking((prev) => (prev ? { ...prev, status: data.booking.status } : prev));
      notify.success("Booking cancelled", "The booking has been cancelled.");
    } catch (error) {
      if (isApiClientError(error) && error.fields) {
        setFieldErrors(error.fields);
      }
      const nextMessage = error instanceof Error ? error.message : "Unable to cancel.";
      setMessage(nextMessage);
      notify.error(
        "Cancellation failed",
        nextMessage,
        getErrorHint(error, "Try again or contact the shop."),
        isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
      );
    } finally {
      setCancelling(false);
      setConfirmCancelOpen(false);
    }
  }

  async function submitRating() {
    if (submittingRating || ratingValue === 0) return;
    setSubmittingRating(true);
    setRatingMessage(null);
    try {
      const res = await fetch(`/api/app/bookings/${params.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: ratingValue, comment: ratingComment || undefined })
      });
      const raw = await res.json();
      if (!res.ok) {
        setRatingMessage(raw?.error?.message || "Unable to submit rating.");
        return;
      }
      const data = raw.data ?? raw;
      setExistingRating(data.rating);
      setRatingMessage("Thank you for your feedback!");
    } catch {
      setRatingMessage("Network error. Please try again.");
    } finally {
      setSubmittingRating(false);
    }
  }

  if (fetchError) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <h1 className="font-display font-bold text-foreground text-lg mb-3">Booking details</h1>
        <ErrorState
          title="Booking unavailable"
          message={fetchError}
          hint={fetchHint || undefined}
          onRetry={loadBooking}
        />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <Skeleton className="h-6 w-1/2 mb-3" />
        <Skeleton className="h-4 w-2/3 mb-2" />
        <Skeleton className="h-4 w-3/5 mb-2" />
        <Skeleton className="h-4 w-2/5 mb-6" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    );
  }

  const isCompleted = booking.status === "COMPLETED";
  const isCancelled = booking.status === "CANCELLED";
  const jobStatus = booking.jobCard?.status;
  const jobStarted =
    jobStatus === "EN_ROUTE" ||
    jobStatus === "ARRIVED" ||
    jobStatus === "IN_PROGRESS" ||
    jobStatus === "AWAITING_APPROVAL" ||
    jobStatus === "COMPLETED";
  const canAmend = booking.status === "CONFIRMED" && !jobStarted;

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <div>
        <a href="/app/bookings">
          <Button variant="outline" size="sm">Back to my bookings</Button>
        </a>
      </div>

      {/* Booking info */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h1 className="font-display font-bold text-foreground text-lg mb-2">Booking {booking.referenceCode}</h1>
        <div className="space-y-1 text-sm">
          <p className="text-foreground">{booking.itemName}</p>
          <p className="text-muted-foreground">{formatDateTimeZA(booking.scheduledStartAt)}</p>
          <p className="text-muted-foreground">{booking.addressText}</p>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <strong className="text-sm">Status:</strong>
          <BookingStatusBadge status={booking.status} />
        </div>
        {booking.jobCard ? (
          <div className="rounded-lg border border-border p-3 mt-4">
            <div className="text-sm"><strong>Job card:</strong> {booking.jobCard.ref}</div>
            <div className="flex items-center gap-2 mt-1 text-sm">
              <strong>Workshop progress:</strong>
              <BookingStatusBadge status={booking.jobCard.status} />
            </div>
          </div>
        ) : null}
        {booking.notes ? <p className="text-sm text-muted-foreground mt-2">Notes: {booking.notes}</p> : null}
      </div>

      {/* Pending extras */}
      {booking.pendingExtras && booking.pendingExtras.length > 0 ? (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-1">Extras awaiting your approval</h3>
          <p className="text-sm text-muted-foreground mb-4">Approve or reject proposed additional work before completion.</p>
          <div className="flex flex-col gap-3">
            {booking.pendingExtras.map((extra) => (
              <div key={extra.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <strong className="text-sm">{extra.name}</strong>
                  <div className="text-xs text-muted-foreground">{extra.type}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">R {(extra.amountCents / 100).toFixed(2)}</div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => decideExtra(extra.id, "reject")}>
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => decideExtra(extra.id, "approve")}>Approve</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Rating (completed bookings) */}
      {isCompleted ? (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-3">Rate your service</h3>
          {existingRating ? (
            <div>
              <p className="text-sm mb-2">Your rating:</p>
              <StarDisplay value={existingRating.rating} />
              {existingRating.comment ? <p className="text-sm text-muted-foreground mt-2">{existingRating.comment}</p> : null}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">How was your experience? Your feedback helps us improve.</p>
              <StarInput value={ratingValue} onChange={setRatingValue} />
              <LabeledInput
                label="Comment (optional)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                helperText="Tell us about your experience."
              />
              {ratingMessage ? <p className="text-sm text-muted-foreground">{ratingMessage}</p> : null}
              <Button
                onClick={submitRating}
                disabled={submittingRating || ratingValue === 0}
              >
                {submittingRating ? "Submitting..." : "Submit rating"}
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {/* Reschedule / Cancel */}
      {!isCompleted && !isCancelled && canAmend ? (
        <>
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-3">Reschedule</h3>
            <div className="flex flex-col gap-3">
              <LabeledInput
                label="New slot"
                type="datetime-local"
                value={slotIso}
                onChange={(e) => setSlotIso(e.target.value)}
                error={fieldErrors.slotIso || null}
              />
              <Button onClick={reschedule} disabled={rescheduling || !slotIso}>
                {rescheduling ? "Rescheduling..." : "Reschedule"}
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-3">Cancel booking</h3>
            <div className="flex flex-col gap-3">
              <LabeledInput label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} error={fieldErrors.reason || null} />
              <Button variant="outline" onClick={() => setConfirmCancelOpen(true)} disabled={cancelling}>
                {cancelling ? "Cancelling..." : "Cancel booking"}
              </Button>
            </div>
          </div>
        </>
      ) : null}
      {!isCompleted && !isCancelled && !canAmend ? (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-2">Amendments unavailable</h3>
          <p className="text-sm text-muted-foreground">
            This booking can no longer be amended online because the workshop job is underway.
            Please contact the shop for assistance.
          </p>
        </div>
      ) : null}

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <ConfirmDialog
        open={confirmCancelOpen}
        title="Cancel booking?"
        message="This will cancel the booking and notify the workshop. This action cannot be undone online."
        detail={booking.referenceCode}
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        variant="danger"
        loading={cancelling}
        onCancel={() => setConfirmCancelOpen(false)}
        onConfirm={() => {
          void cancel();
        }}
      />
    </div>
  );
}
