"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getApiBaseUrl } from "@/lib/api";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import PublicHeroBanner from "@/app/components/PublicHeroBanner";
import Stepper from "../components/Stepper";
type BookingDraft = {
  itemType: "package" | "service";
  itemId: string;
  itemName: string;
  durationMinutes: number;
  priceCents: number;
  customerName: string;
  customerPhone: string;
  customerBikeId?: string;
  customerBikeLabel?: string;
  preferredMechanicId?: string;
  preferredMechanicName?: string;
  addressText: string;
  notes?: string;
  distanceKm?: number;
  addOnsCents?: number;
  consumablesCents?: number;
  partsCents?: number;
  afterHours?: boolean;
  slotStart?: string;
  slotEnd?: string;
  slotLabel?: string;
};

type Slot = {
  start: string;
  end: string;
  label: string;
};

type AvailabilityResponse = {
  date: string;
  timeZone: string;
  slots: Slot[];
};

function defaultDate() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Johannesburg"
  }).format(tomorrow);
}

function plusDays(date: string, days: number) {
  const base = new Date(`${date}T00:00:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export default function BookSlotPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [date, setDate] = useState(defaultDate());
  const [dateTouched, setDateTouched] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [slotHint, setSlotHint] = useState<string | null>(null);

  useEffect(() => {
    const raw = safeGetItem("bookingDraft");
    if (!raw) {
      router.push("/book/start");
      return;
    }
    setDraft(JSON.parse(raw));
  }, [router]);

  useEffect(() => {
    async function loadAvailability() {
      if (!draft) return;
      setLoading(true);
      setError(null);
      setInlineError(null);
      setSlotHint(null);
      setSelected(null);
      const fetchSlots = async (targetDate: string) => {
        const res = await fetch(
          `${getApiBaseUrl()}/api/public/availability?date=${targetDate}&itemType=${draft.itemType}&itemId=${draft.itemId}`
        );
        if (!res.ok) {
          return { ok: false as const, slots: [] as Slot[] };
        }
        const data: AvailabilityResponse = await res.json();
        return { ok: true as const, slots: data.slots };
      };
      try {
        const initial = await fetchSlots(date);
        if (!initial.ok) {
          setError("Could not load availability.");
          return;
        }
        if (initial.slots.length > 0 || dateTouched) {
          setSlots(initial.slots);
          return;
        }

        for (let offset = 1; offset <= 14; offset += 1) {
          const candidateDate = plusDays(date, offset);
          const next = await fetchSlots(candidateDate);
          if (!next.ok) {
            setError("Could not load availability.");
            return;
          }
          if (next.slots.length > 0) {
            setDate(candidateDate);
            setSlots(next.slots);
            setSlotHint("No slots on the default date. Showing the next available date.");
            return;
          }
        }

        setSlots([]);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadAvailability();
  }, [draft, date, dateTouched]);

  const canContinue = useMemo(() => Boolean(draft && selected), [draft, selected]);

  function onContinue() {
    if (!draft || !selected) return;
    const nextDraft = {
      ...draft,
      slotStart: selected.start,
      slotEnd: selected.end,
      slotLabel: selected.label
    };
    safeSetItem("bookingDraft", JSON.stringify(nextDraft));
    router.push("/book/review");
  }

  if (!draft) {
    return (
      <Container>
        <PublicHeroBanner

          eyebrow="Online Booking"
          title="Pick your preferred slot"
          description="Only available slots are shown based on service and notice rules."
        />
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="h-6 w-3/5 rounded-md bg-muted animate-pulse mb-3" />
          <div className="h-4 w-4/5 rounded-md bg-muted animate-pulse mb-6" />
          <div className="h-11 w-full rounded-lg bg-muted animate-pulse mb-3" />
          <div className="h-11 w-full rounded-lg bg-muted animate-pulse mb-3" />
          <div className="h-11 w-full rounded-lg bg-muted animate-pulse" />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <PublicHeroBanner
        eyebrow="Online Booking"
        title="Pick your preferred slot"
        description="Only available slots are shown based on service and notice rules."
      />
      <Stepper
        current={2}
        steps={["Select service", "Your details", "Choose slot", "Review", "Confirmation"]}
      />
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-foreground text-lg mb-1">Pick a time slot</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {draft.itemName} — choose a preferred date and time. We will confirm your slot after
          submission.
        </p>
        <div className="space-y-1.5 mb-4">
          <label className="text-sm font-medium text-foreground">Preferred date</label>
          <input
            type="date"
            value={date}
            onChange={(event) => {
              setDateTouched(true);
              setDate(event.target.value);
            }}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-11 w-full rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : null}
        {slotHint ? <p className="text-sm text-muted-foreground mt-2">{slotHint}</p> : null}
        {error ? (
          <div>
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="mt-3" onClick={() => { setError(null); setLoading(true); }}>
              Retry
            </Button>
          </div>
        ) : null}
        {!loading && !error && slots.length === 0 ? (
          <div>
            <p className="text-sm">No availability for this date.</p>
            <p className="text-sm text-muted-foreground mt-1">Try selecting a different date above, or contact us for assistance.</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 mt-4">
          {slots.map((slot) => (
            <button
              key={slot.start}
              onClick={() => setSelected(slot)}
              className={`h-11 w-full rounded-lg border px-4 text-sm font-medium transition-colors ${
                selected?.start === slot.start
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:bg-muted/50"
              }`}
            >
              {slot.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {inlineError ? <p className="text-sm text-destructive mb-2">{inlineError}</p> : null}
          <Button
            onClick={() => {
              if (!selected) {
                setInlineError("Please select a time slot to continue.");
                return;
              }
              onContinue();
            }}
            disabled={!canContinue}
          >
            Continue to review
          </Button>
        </div>
      </div>
    </Container>
  );
}
