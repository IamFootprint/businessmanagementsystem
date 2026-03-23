import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bike, Calendar, Check, ChevronRight, Clock, MapPin, Wrench } from "lucide-react";
import { Button } from "@/revamp/components/ui/button";
import { Input } from "@/revamp/components/ui/input";
import { Textarea } from "@/revamp/components/ui/textarea";
import { PhoneField } from "@/revamp/components/PhoneField";
import { cn } from "@/revamp/lib/utils";
import { apiFetch } from "@/lib/client/api";
import { validateE164 } from "@/lib/auth/phone";
import { formatDurationMinutes, formatZarFromCents } from "@/revamp/lib/formatters";

type CatalogItem = {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
};

type CatalogResponse = {
  services: CatalogItem[];
  packages: CatalogItem[];
};

type MechanicOption = {
  id: string;
  name?: string | null;
  phone: string;
};

type Bike = {
  id: string;
  bikeType: string;
  brand: string;
  model?: string | null;
  eBike?: boolean;
};

type Location = {
  id: string;
  label?: string | null;
  addressLine1: string;
  suburb?: string | null;
  city?: string | null;
};

type Slot = {
  start: string;
  end: string;
  label: string;
};

type QuoteLineItem = {
  code: string;
  label: string;
  amountCents: number;
};

type QuoteResponse = {
  lineItems: QuoteLineItem[];
  subtotalCents: number;
  totalCents: number;
  currency: "ZAR";
};

type BookingResponse = {
  bookingId: string;
  referenceCode: string;
  summary?: {
    scheduledStartAt?: string;
    addressText?: string;
  };
};

function tomorrowDateIso() {
  const target = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(target);
}

function bikeLabel(bike: Bike) {
  const label = [bike.brand, bike.model || ""].filter(Boolean).join(" ").trim() || "Bike";
  return bike.eBike ? `${label} (E-Bike)` : label;
}

export default function BookingFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryItemType = searchParams.get("itemType") === "package" ? "package" : "service";
  const queryItemId = searchParams.get("itemId") || "";

  const [currentStep, setCurrentStep] = useState(0);
  const [itemType, setItemType] = useState<"package" | "service">(queryItemType);
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerBikeId, setCustomerBikeId] = useState("");
  const [preferredMechanicId, setPreferredMechanicId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [suburb, setSuburb] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState(tomorrowDateIso());
  const [selectedSlotStart, setSelectedSlotStart] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = ["Details", "Slot", "Review"];

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [catalogData, mechanicsRes, whoamiRes, bikesRes, locationsRes] = await Promise.all([
          apiFetch<CatalogResponse>("/api/public/catalog"),
          fetch("/api/public/mechanics", { cache: "no-store" }),
          fetch("/api/auth/whoami", { cache: "no-store", credentials: "include" }),
          fetch("/api/app/bikes", { cache: "no-store", credentials: "include" }),
          fetch("/api/app/locations", { cache: "no-store", credentials: "include" }),
        ]);

        if (ignore) return;

        const bucket = itemType === "package" ? catalogData.packages || [] : catalogData.services || [];
        const resolvedItem = (queryItemId ? bucket.find((entry) => entry.id === queryItemId) : undefined) || bucket[0] || null;
        setItem(resolvedItem);

        const mechanicsJson = await mechanicsRes.json().catch(() => ({}));
        setMechanics(mechanicsJson.mechanics || []);

        const whoamiJson = await whoamiRes.json().catch(() => ({}));
        if (whoamiRes.ok && whoamiJson?.authenticated) {
          setCustomerName(whoamiJson.profile?.name || "");
          setCustomerPhone(whoamiJson.profile?.phone || "");
        }

        if (bikesRes.ok) {
          const bikesJson = await bikesRes.json().catch(() => ({}));
          const nextBikes = bikesJson.bikes || [];
          setBikes(nextBikes);
          if (nextBikes[0]) setCustomerBikeId(nextBikes[0].id);
        }

        if (locationsRes.ok) {
          const locationsJson = await locationsRes.json().catch(() => ({}));
          const nextLocations = locationsJson.locations || [];
          setLocations(nextLocations);
          if (nextLocations[0]) {
            const location = nextLocations[0];
            setLocationId(location.id);
            setAddressLine1(location.addressLine1 || "");
            setSuburb(location.suburb || "");
            setCity(location.city || "");
          }
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load booking setup.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [itemType, queryItemId]);

  useEffect(() => {
    let ignore = false;
    async function loadSlots() {
      if (!item || currentStep !== 1) return;
      setLoadingSlots(true);
      setSelectedSlotStart("");
      try {
        const data = await apiFetch<{ slots: Slot[] }>(
          `/api/public/availability?date=${selectedDate}&itemType=${itemType}&itemId=${item.id}`
        );
        if (ignore) return;
        setSlots(data.slots || []);
      } catch (loadError) {
        if (!ignore) {
          setSlots([]);
          setError(loadError instanceof Error ? loadError.message : "Unable to load slots.");
        }
      } finally {
        if (!ignore) setLoadingSlots(false);
      }
    }
    void loadSlots();
    return () => {
      ignore = true;
    };
  }, [item, itemType, selectedDate, currentStep]);

  useEffect(() => {
    let ignore = false;
    async function loadQuote() {
      if (!item || currentStep !== 2) return;
      try {
        const data = await apiFetch<QuoteResponse>("/api/public/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemType, itemId: item.id }),
        });
        if (!ignore) setQuote(data);
      } catch {
        if (!ignore) setQuote(null);
      }
    }
    void loadQuote();
    return () => {
      ignore = true;
    };
  }, [item, itemType, currentStep]);

  const selectedSlot = useMemo(() => {
    return slots.find((slot) => slot.start === selectedSlotStart) || null;
  }, [slots, selectedSlotStart]);

  const canContinueFromDetails = useMemo(() => {
    return Boolean(item && customerName.trim() && validateE164(customerPhone) && addressLine1.trim());
  }, [item, customerName, customerPhone, addressLine1]);

  const canContinueFromSlot = Boolean(selectedSlotStart);

  function handleLocationChange(nextId: string) {
    setLocationId(nextId);
    const chosen = locations.find((location) => location.id === nextId);
    if (!chosen) return;
    setAddressLine1(chosen.addressLine1 || "");
    setSuburb(chosen.suburb || "");
    setCity(chosen.city || "");
  }

  async function confirmBooking() {
    if (!item || !selectedSlot || !canContinueFromDetails) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch<BookingResponse>("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerBikeId: customerBikeId || undefined,
          preferredMechanicId: preferredMechanicId || undefined,
          itemType,
          itemId: item.id,
          addressLine1: addressLine1.trim(),
          suburb: suburb.trim() || undefined,
          city: city.trim() || undefined,
          notes: notes.trim() || undefined,
          slotStart: selectedSlot.start,
          pricingSnapshot: quote || undefined,
        }),
      });
      const targetRef = encodeURIComponent(data.referenceCode || "");
      const slotParam = encodeURIComponent(selectedSlot.start);
      const addressParam = encodeURIComponent(addressLine1);
      navigate(`/success?ref=${targetRef}&slot=${slotParam}&address=${addressParam}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to confirm booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 h-14 bg-card/95 backdrop-blur-sm border-b border-border flex items-center gap-3 px-4">
        <button onClick={() => (currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate(-1))} className="p-1 -ml-1 rounded-lg hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display font-bold text-foreground">Book Service</h1>
      </header>

      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={cn("flex items-center gap-2", index <= currentStep ? "text-primary" : "text-muted-foreground")}>
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    index <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {index < currentStep ? <Check className="w-3.5 h-3.5" /> : index + 1}
                </div>
                <span className="text-xs font-semibold hidden sm:block">{step}</span>
              </div>
              {index < steps.length - 1 && <div className={cn("flex-1 h-0.5 rounded-full", index < currentStep ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">Loading booking setup...</p>
          </div>
        ) : null}
        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10 mb-4">
            <p className="text-sm text-status-cancelled">{error}</p>
          </div>
        ) : null}

        {currentStep === 0 ? (
          <div className="stack">
            <div className="panel-padded">
              <p className="text-xs text-muted-foreground mb-1">Service</p>
              <p className="font-semibold text-foreground">{item?.name || "Service unavailable"}</p>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-primary font-bold">{formatZarFromCents(item?.priceCents)}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDurationMinutes(item?.durationMinutes)}
                </p>
              </div>
            </div>

            <Input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Customer name"
              className="h-12"
            />
            <PhoneField
              value={customerPhone}
              onChange={setCustomerPhone}
              helperText="Use your mobile number for booking updates."
            />

            {bikes.length > 0 ? (
              <div>
                <label className="text-sm font-medium text-foreground">Bike</label>
                <select
                  className="mt-1 h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={customerBikeId}
                  onChange={(event) => setCustomerBikeId(event.target.value)}
                >
                  <option value="">Select bike</option>
                  {bikes.map((bike) => (
                    <option key={bike.id} value={bike.id}>
                      {bikeLabel(bike)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="panel-padded">
                <p className="text-xs text-muted-foreground">No saved bikes. You can still continue with your booking.</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground">Preferred mechanic (optional)</label>
              <select
                className="mt-1 h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={preferredMechanicId}
                onChange={(event) => setPreferredMechanicId(event.target.value)}
              >
                <option value="">No preference</option>
                {mechanics.map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>
                    {mechanic.name || mechanic.phone}
                  </option>
                ))}
              </select>
            </div>

            {locations.length > 0 ? (
              <div>
                <label className="text-sm font-medium text-foreground">Saved location</label>
                <select
                  className="mt-1 h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={locationId}
                  onChange={(event) => handleLocationChange(event.target.value)}
                >
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.label || location.addressLine1}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <Input
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
              placeholder="Address line 1"
              className="h-12"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input value={suburb} onChange={(event) => setSuburb(event.target.value)} placeholder="Suburb" className="h-12" />
              <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" className="h-12" />
            </div>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Any additional notes about your bike or location..."
            />
          </div>
        ) : null}

        {currentStep === 1 ? (
          <div className="stack">
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Select Date
              </label>
              <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-12" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Select Time
              </label>
              {loadingSlots ? (
                <div className="panel-padded">
                  <p className="text-sm text-muted-foreground">Loading slots...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="panel-padded">
                  <p className="text-sm text-muted-foreground">No slots available for this date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.start}
                      onClick={() => setSelectedSlotStart(slot.start)}
                      className={cn(
                        "py-3 px-2 rounded-lg border text-sm font-semibold transition-all",
                        selectedSlotStart === slot.start ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                      )}
                    >
                      {slot.label.split(" ").slice(-1)[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div className="stack">
            <h2 className="font-display font-bold text-lg text-foreground">Booking Summary</h2>
            <div className="panel divide-y divide-border">
              <div className="p-4 flex justify-between">
                <span className="text-sm text-muted-foreground">Service</span>
                <span className="text-sm font-semibold text-foreground">{item?.name || "Service"}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-sm text-muted-foreground">Bike</span>
                <span className="text-sm font-semibold text-foreground">
                  {bikes.find((bike) => bike.id === customerBikeId) ? bikeLabel(bikes.find((bike) => bike.id === customerBikeId) as Bike) : "—"}
                </span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-sm text-muted-foreground">Date & Time</span>
                <span className="text-sm font-semibold text-foreground">{selectedSlot?.label || "—"}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-sm text-muted-foreground">Location</span>
                <span className="text-sm font-semibold text-foreground">{addressLine1 || "—"}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-lg font-bold text-primary">{formatZarFromCents(quote?.totalCents ?? item?.priceCents)}</span>
              </div>
            </div>

            {quote?.lineItems?.length ? (
              <div className="panel-padded">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Estimate breakdown</p>
                <div className="space-y-1.5">
                  {quote.lineItems.map((line) => (
                    <div key={line.code} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{line.label}</span>
                      <span className="font-semibold text-foreground">{formatZarFromCents(line.amountCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="panel-padded flex items-start gap-3">
              <MapPin className="w-5 h-5 text-secondary-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Address confirmation</p>
                <p className="text-xs text-muted-foreground mt-0.5">Please confirm your location details are correct for dispatch.</p>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            className="w-full"
            size="lg"
            disabled={
              loading ||
              submitting ||
              (currentStep === 0 && !canContinueFromDetails) ||
              (currentStep === 1 && !canContinueFromSlot) ||
              (currentStep === 2 && !selectedSlot)
            }
            onClick={() => {
              if (currentStep === 0) {
                setCurrentStep(1);
                return;
              }
              if (currentStep === 1) {
                setCurrentStep(2);
                return;
              }
              void confirmBooking();
            }}
          >
            {currentStep === 0 ? "Choose Time Slot" : currentStep === 1 ? "Review Booking" : submitting ? "Confirming..." : "Confirm Booking"}
          </Button>
        </div>
      </div>
    </div>
  );
}
