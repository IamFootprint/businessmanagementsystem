import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CustomerShell } from "@/revamp/components/CustomerShell";
import { StatusBadge } from "@/revamp/components/StatusBadge";
import { Button } from "@/revamp/components/ui/button";
import { Plus, Wrench, Calendar, ArrowRight, Bike, MapPin, Bell } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { formatBikeLabel, formatBikeType, formatDateTimeCompactZA, formatZarFromCents } from "@/revamp/lib/formatters";

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

type CustomerBike = {
  id: string;
  bikeType: string;
  brand: string;
  model?: string | null;
  eBike?: boolean;
  updatedAtIso?: string;
};

type WhoAmIResponse = {
  profile?: {
    name?: string | null;
  };
};

function isActiveBooking(status: string) {
  const normalized = status.trim().toUpperCase();
  return normalized !== "COMPLETED" && normalized !== "CANCELLED";
}

export default function CustomerHome() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [bikes, setBikes] = useState<CustomerBike[]>([]);
  const [customerName, setCustomerName] = useState("Rider");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [bookingsData, bikesRes, whoamiRes] = await Promise.all([
          apiFetch<{ bookings: CustomerBooking[] }>("/api/public/bookings"),
          fetch("/api/app/bikes", { cache: "no-store" }),
          fetch("/api/auth/whoami", { cache: "no-store" }),
        ]);

        const bikesJson = await bikesRes.json().catch(() => ({}));
        const whoamiJson = await whoamiRes.json().catch(() => ({})) as WhoAmIResponse;
        if (ignore) return;

        setBookings((bookingsData.bookings || []).slice());
        setBikes((bikesJson.bikes || []) as CustomerBike[]);
        setCustomerName(whoamiJson.profile?.name?.trim() || "Rider");
      } catch {
        if (ignore) return;
        setError("Unable to load your latest dashboard data.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const activeBooking = useMemo(() => {
    if (bookings.length === 0) return null;
    return bookings.find((booking) => isActiveBooking(booking.status)) || bookings[0];
  }, [bookings]);

  const bikesPreview = useMemo(() => {
    return bikes
      .slice()
      .sort((a, b) => (b.updatedAtIso || "").localeCompare(a.updatedAtIso || ""))
      .slice(0, 2);
  }, [bikes]);

  return (
    <CustomerShell
      headerRight={
        <button onClick={() => navigate("/app/notifications")} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
        </button>
      }
    >
      <div className="stack-lg">
        {/* Greeting */}
        <div>
          <p className="text-sm text-muted-foreground">Good morning</p>
          <h1 className="text-2xl font-display font-bold text-foreground">{customerName}</h1>
        </div>

        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled">{error}</p>
          </div>
        ) : null}

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Wrench, label: "Book Service", path: "/book" },
            { icon: Calendar, label: "Bookings", path: "/app/bookings" },
            { icon: Plus, label: "Add Bike", path: "/app/bikes" },
          ].map((a) => (
            <Link
              key={a.label}
              to={a.path}
              className="panel-padded flex flex-col items-center gap-2 hover:bg-muted/30 transition-colors text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <a.icon className="w-5 h-5 text-secondary-foreground" />
              </div>
              <span className="text-xs font-semibold text-foreground">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Active booking */}
        <section>
          <div className="section-heading">
            <h2 className="text-base">Active Booking</h2>
            <Link to="/app/bookings" className="text-sm text-primary font-semibold flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="panel-padded">
              <p className="text-sm text-muted-foreground">Loading active booking...</p>
            </div>
          ) : activeBooking ? (
            <Link to={`/app/bookings/${activeBooking.id}`} className="panel-padded block hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-foreground">{activeBooking.serviceNameSnapshot}</p>
                  <p className="text-sm font-bold text-primary mt-0.5">
                    {formatZarFromCents(activeBooking.pricingSnapshot?.totalCents)}
                  </p>
                </div>
                <StatusBadge status={activeBooking.status} />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDateTimeCompactZA(activeBooking.slotIso)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{activeBooking.addressLine1 || "Address unavailable"}</span>
              </div>
            </Link>
          ) : (
            <div className="panel-padded">
              <p className="text-sm text-muted-foreground mb-3">No active booking right now.</p>
              <Button size="sm" onClick={() => navigate("/book")}>Book Service</Button>
            </div>
          )}
        </section>

        {/* My bikes */}
        <section>
          <div className="section-heading">
            <h2 className="text-base">My Bikes</h2>
            <Link to="/app/bikes" className="text-sm text-primary font-semibold flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add
            </Link>
          </div>
          {loading ? (
            <div className="panel-padded">
              <p className="text-sm text-muted-foreground">Loading bikes...</p>
            </div>
          ) : bikesPreview.length > 0 ? (
            <div className="stack-sm">
              {bikesPreview.map((bike) => (
                <div key={bike.id} className="panel-padded flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Bike className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{formatBikeLabel(bike)}</p>
                    <p className="text-sm text-muted-foreground">{formatBikeType(bike.bikeType)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel-padded">
              <p className="text-sm text-muted-foreground mb-3">No bikes added yet.</p>
              <Button variant="outline" size="sm" onClick={() => navigate("/app/bikes")}>Add Bike</Button>
            </div>
          )}
        </section>

        {/* CTA */}
        <div className="panel-padded bg-primary">
          <h3 className="font-display font-bold text-primary-foreground text-lg mb-1">Time for a tune-up?</h3>
          <p className="text-primary-foreground/70 text-sm mb-3">Book a service in under 2 minutes</p>
          <Button
            variant="accent"
            size="sm"
            onClick={() => navigate("/book")}
          >
            Book Now
          </Button>
        </div>
      </div>
    </CustomerShell>
  );
}
