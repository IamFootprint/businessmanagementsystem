"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import BookingStatusBadge from "@/app/components/BookingStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeZA } from "@/lib/format/date";
import { Wrench, Calendar, Plus, Bike, MapPin, ArrowRight } from "lucide-react";

type Booking = {
  id: string;
  ref: string;
  serviceNameSnapshot: string;
  slotIso: string;
  status: string;
  addressLine1?: string;
  pricingSnapshot?: {
    totalCents?: number;
  };
};

type Bike = {
  id: string;
  bikeType: string;
  brand: string;
  model?: string | null;
  eBike?: boolean;
  updatedAtIso?: string;
};

function bikeLabel(bike: Bike) {
  const parts = [bike.brand, bike.model || "", bike.bikeType].filter(Boolean);
  const label = parts.join(" ");
  return bike.eBike ? `${label} (e-bike)` : label;
}

function formatBikeType(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatPrice(cents?: number): string {
  if (cents == null) return "";
  return `R ${(cents / 100).toFixed(0)}`;
}

export default function AppPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [customerName, setCustomerName] = useState("Rider");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [bookingsRes, bikesRes, whoamiRes] = await Promise.all([
          fetch("/api/public/bookings"),
          fetch("/api/app/bikes"),
          fetch("/api/auth/whoami"),
        ]);
        const bookingsData = await bookingsRes.json().catch(() => ({}));
        const bikesData = await bikesRes.json().catch(() => ({}));
        const whoamiData = await whoamiRes.json().catch(() => ({}));
        if (ignore) return;

        if (bookingsRes.ok) setBookings(bookingsData.bookings || []);
        if (bikesRes.ok) setBikes(bikesData.bikes || []);
        setCustomerName(whoamiData.profile?.name?.trim() || "Rider");
      } catch {
        if (ignore) return;
        setError("We couldn't load your dashboard. Check your internet connection and try again.");
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
    return (
      bookings.find(
        (b) => b.status !== "COMPLETED" && b.status !== "CANCELLED"
      ) || bookings[0]
    );
  }, [bookings]);

  const bikesPreview = useMemo(() => {
    return bikes
      .slice()
      .sort((a, b) =>
        (b.updatedAtIso || "").localeCompare(a.updatedAtIso || "")
      )
      .slice(0, 2);
  }, [bikes]);

  const quickActions = [
    { icon: Wrench, label: "Book Service", href: "/book/start" },
    { icon: Calendar, label: "Bookings", href: "/app/bookings" },
    { icon: Plus, label: "Add Bike", href: "/app/bikes" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Personalized greeting */}
      <div>
        <p className="text-sm text-muted-foreground">{getGreeting()}</p>
        <h1 className="text-2xl font-display font-bold text-foreground">
          {loading ? <Skeleton className="h-8 w-40 inline-block" /> : customerName}
        </h1>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-semibold text-foreground text-sm mb-1">Dashboard unavailable</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            className="text-sm text-primary hover:underline mt-2"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
          <p className="text-[11px] text-muted-foreground/70 mt-2">
            If this keeps happening, contact{" "}
            <a href="mailto:support@cycledesk.co.za" className="text-primary hover:underline">support@cycledesk.co.za</a>
          </p>
        </div>
      ) : null}

      {/* Quick action grid */}
      <div className="grid grid-cols-3 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="bg-card rounded-xl border border-border p-4 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors text-center"
          >
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <action.icon className="w-5 h-5 text-secondary-foreground" />
            </div>
            <span className="text-xs font-semibold text-foreground">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Active booking */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-foreground">Active booking</h2>
          <Link
            href="/app/bookings"
            className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : null}
        {!loading && !activeBooking ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">No active booking right now.</p>
            <Link href="/book/start">
              <Button>Book Service</Button>
            </Link>
          </div>
        ) : null}
        {!loading && activeBooking ? (
          <Link
            href={`/app/bookings/${activeBooking.id}`}
            className="block rounded-lg border border-border p-4 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-foreground text-sm">
                  {activeBooking.serviceNameSnapshot}
                </p>
                {activeBooking.pricingSnapshot?.totalCents != null ? (
                  <p className="text-sm font-bold text-primary mt-0.5">
                    {formatPrice(activeBooking.pricingSnapshot.totalCents)}
                  </p>
                ) : null}
              </div>
              <BookingStatusBadge status={activeBooking.status} />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>{formatDateTimeZA(activeBooking.slotIso)}</span>
            </div>
            {activeBooking.addressLine1 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{activeBooking.addressLine1}</span>
              </div>
            ) : null}
          </Link>
        ) : null}
      </div>

      {/* My bikes preview */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-foreground">My bikes</h2>
          <Link
            href="/app/bikes"
            className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : null}
        {!loading && bikesPreview.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">No bikes added yet.</p>
            <Link href="/app/bikes">
              <Button variant="outline" size="sm">Add Bike</Button>
            </Link>
          </div>
        ) : null}
        {!loading && bikesPreview.length > 0 ? (
          <div className="flex flex-col gap-2">
            {bikesPreview.map((bike) => (
              <div key={bike.id} className="rounded-lg border border-border p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Bike className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{bikeLabel(bike)}</p>
                  <p className="text-xs text-muted-foreground">{formatBikeType(bike.bikeType)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* CTA banner */}
      <div className="rounded-xl bg-primary p-5">
        <h3 className="font-display font-bold text-primary-foreground text-lg mb-1">
          Time for a tune-up?
        </h3>
        <p className="text-primary-foreground/70 text-sm mb-3">
          Book a service in under 2 minutes
        </p>
        <Link href="/book/start">
          <Button variant="secondary" size="sm">Book Now</Button>
        </Link>
      </div>
    </div>
  );
}
