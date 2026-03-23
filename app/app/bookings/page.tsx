"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import BookingStatusBadge from "@/app/components/BookingStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeZA } from "@/lib/format/date";
type Booking = {
  id: string;
  ref: string;
  serviceNameSnapshot: string;
  slotIso: string;
  status: string;
};

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadBookings() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public/bookings");
      if (!res.ok) {
        setError("Failed to load bookings.");
        return;
      }
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch {
      setError("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-bold text-foreground text-lg">My bookings</h1>
        <a href="/book/start">
          <Button variant="outline" size="sm">Book service</Button>
        </a>
      </div>
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <Skeleton className="h-5 w-1/2 mb-2" />
              <Skeleton className="h-4 w-2/5 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : null}
      {error ? (
        <div>
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" className="mt-3" onClick={loadBookings}>Retry</Button>
        </div>
      ) : null}
      {!loading && !error && bookings.length === 0 ? (
        <div>
          <p className="text-sm text-foreground">No bookings yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Book your first service to get started.</p>
          <a href="/book/start">
            <Button className="mt-3">Book a service</Button>
          </a>
        </div>
      ) : null}
      <div className="flex flex-col gap-3">
        {bookings.map((booking) => (
          <div key={booking.id} className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
            <div className="space-y-1">
              <strong className="text-sm font-semibold text-foreground">{booking.serviceNameSnapshot}</strong>
              <div className="text-sm text-muted-foreground">{formatDateTimeZA(booking.slotIso)}</div>
              <div className="mt-1">
                <BookingStatusBadge status={booking.status} />
              </div>
            </div>
            <Button size="sm" onClick={() => (window.location.href = `/app/bookings/${booking.id}`)}>
              View
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
