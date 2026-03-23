import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CustomerShell } from "@/revamp/components/CustomerShell";
import { StatusBadge } from "@/revamp/components/StatusBadge";
import { Button } from "@/revamp/components/ui/button";
import { Calendar, MapPin } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { formatDateTimeCompactZA, formatZarFromCents } from "@/revamp/lib/formatters";

type CustomerBooking = {
  id: string;
  ref: string;
  serviceNameSnapshot: string;
  slotIso: string;
  status: string;
  addressLine1: string;
  pricingSnapshot?: {
    totalCents?: number;
  };
};

export default function Bookings() {
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadBookings() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ bookings: CustomerBooking[] }>("/api/public/bookings");
      setBookings((data.bookings || []).slice());
    } catch {
      setError("Unable to load bookings right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBookings();
  }, []);

  const sortedBookings = useMemo(() => {
    return bookings
      .slice()
      .sort((a, b) => a.slotIso.localeCompare(b.slotIso));
  }, [bookings]);

  return (
    <CustomerShell title="My Bookings">
      <div className="stack">
        {loading ? (
          <>
            <div className="panel-padded"><p className="text-sm text-muted-foreground">Loading bookings...</p></div>
            <div className="panel-padded"><p className="text-sm text-muted-foreground">Loading bookings...</p></div>
          </>
        ) : null}
        {error ? (
          <div className="panel-padded">
            <p className="text-sm text-status-cancelled mb-3">{error}</p>
            <Button size="sm" variant="outline" onClick={loadBookings}>Retry</Button>
          </div>
        ) : null}
        {!loading && !error && sortedBookings.length === 0 ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground mb-3">No bookings yet.</p>
            <Button size="sm" asChild>
              <Link to="/book">Book Service</Link>
            </Button>
          </div>
        ) : null}
        {!loading && !error && sortedBookings.map((booking) => (
          <Link key={booking.id} to={`/app/bookings/${booking.id}`} className="panel-padded block hover:bg-muted/20 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-foreground">{booking.serviceNameSnapshot}</p>
                <p className="text-sm font-bold text-primary mt-0.5">
                  {formatZarFromCents(booking.pricingSnapshot?.totalCents)}
                </p>
              </div>
              <StatusBadge status={booking.status} />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDateTimeCompactZA(booking.slotIso)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{booking.addressLine1 || "Address unavailable"}</span>
            </div>
          </Link>
        ))}
      </div>
    </CustomerShell>
  );
}
