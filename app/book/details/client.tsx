"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Container } from "@/components/ui/container";
import { getApiBaseUrl } from "@/lib/api";
import { safeSetItem } from "@/lib/safeStorage";
import Stepper from "../components/Stepper";
import { PhoneInput } from "@/app/components/PhoneInput";
import PublicHeroBanner from "@/app/components/PublicHeroBanner";
import { validateE164 } from "@/lib/auth/phone";
type CatalogItem = {
  id: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  priceCents: number;
};

type CatalogResponse = {
  packages: CatalogItem[];
  services: CatalogItem[];
};

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
};

type SessionResponse = {
  authenticated?: boolean;
  profile?: {
    id: string;
    name?: string;
    phone?: string;
    role?: string;
  };
};

type ClientBike = {
  id: string;
  bikeType: string;
  brand: string;
  model?: string | null;
  eBike?: boolean;
};

type MechanicOption = {
  id: string;
  name?: string | null;
  phone: string;
};

type BookDetailsClientProps = {
  itemType: string;
  itemId: string;
};

function bikeLabel(bike: ClientBike) {
  const parts = [bike.brand, bike.model || "", bike.bikeType].filter(Boolean);
  const label = parts.join(" ");
  return bike.eBike ? `${label} (e-bike)` : label;
}

export default function BookDetailsClient({ itemType, itemId }: BookDetailsClientProps) {
  const router = useRouter();
  const [selection, setSelection] = useState<CatalogItem | null>(null);
  const [selectionType, setSelectionType] = useState<"package" | "service" | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [addressText, setAddressText] = useState("");
  const [notes, setNotes] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [addOns, setAddOns] = useState("");
  const [consumables, setConsumables] = useState("");
  const [parts, setParts] = useState("");
  const [afterHours, setAfterHours] = useState(false);
  const [isClientSession, setIsClientSession] = useState(false);
  const [bikes, setBikes] = useState<ClientBike[]>([]);
  const [customerBikeId, setCustomerBikeId] = useState("");
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
  const [preferredMechanicId, setPreferredMechanicId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadCatalog() {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/public/catalog`);
      if (!res.ok) {
        setCatalogError("Could not load service catalog.");
        return;
      }
      const data: CatalogResponse = await res.json();
      let found: CatalogItem | undefined;
      if (itemType === "service") {
        found = data.services.find((entry) => entry.id === itemId);
        setSelectionType(found ? "service" : null);
      } else if (itemType === "package") {
        found = data.packages.find((entry) => entry.id === itemId);
        setSelectionType(found ? "package" : null);
      } else {
        found = data.packages.find((entry) => entry.id === itemId);
        if (found) {
          setSelectionType("package");
        } else {
          found = data.services.find((entry) => entry.id === itemId);
          setSelectionType(found ? "service" : null);
        }
      }
      setSelection(found || null);
    } catch {
      setCatalogError("Network error loading catalog. Please try again.");
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    if (itemId) loadCatalog();
  }, [itemId, itemType]);

  useEffect(() => {
    async function loadContext() {
      try {
        const [whoamiRes, mechanicsRes] = await Promise.all([
          fetch("/api/auth/whoami", { credentials: "include" }),
          fetch("/api/public/mechanics")
        ]);
        const whoami = (await whoamiRes.json().catch(() => ({}))) as SessionResponse;
        const mechanicsData = await mechanicsRes.json().catch(() => ({}));
        setMechanics(mechanicsData.mechanics || []);

        if (whoamiRes.ok && whoami.authenticated && whoami.profile?.role === "CLIENT") {
          setIsClientSession(true);
          if (whoami.profile.name) {
            setCustomerName((current) => current || whoami.profile?.name || "");
          }
          if (whoami.profile.phone) {
            setCustomerPhone((current) => current || whoami.profile?.phone || "");
          }

          const bikesRes = await fetch("/api/app/bikes", { credentials: "include" });
          const bikesData = await bikesRes.json().catch(() => ({}));
          const nextBikes = bikesRes.ok ? bikesData.bikes || [] : [];
          setBikes(nextBikes);
          if (nextBikes[0]) {
            setCustomerBikeId(nextBikes[0].id);
          }
        } else {
          setIsClientSession(false);
          setBikes([]);
          setCustomerBikeId("");
        }
      } catch {
        setMechanics([]);
      }
    }

    loadContext();
  }, []);

  function parseZarCents(raw: string) {
    const parsed = Number.parseFloat(raw.replace(/,/g, "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return Math.round(parsed * 100);
  }

  function parseDistance(raw: string) {
    const parsed = Number.parseFloat(raw.replace(/,/g, "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return parsed;
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setFieldErrors({});
    if (!selection || !selectionType) {
      setError("Service selection is missing.");
      return;
    }
    if (!customerName || !customerPhone || !addressText) {
      const nextErrors: { [key: string]: string } = {};
      if (!customerName) nextErrors.customerName = "Please enter your full name.";
      if (!customerPhone) nextErrors.customerPhone = "Please add a phone number.";
      if (!addressText) nextErrors.addressText = "Please add the service address.";
      setFieldErrors(nextErrors);
      setError("Please complete all required fields.");
      return;
    }
    if (!validateE164(customerPhone)) {
      setFieldErrors((prev) => ({ ...prev, customerPhone: "Enter a valid phone number." }));
      setError("Please fix the phone number format.");
      return;
    }
    if (isClientSession && bikes.length > 0 && !customerBikeId) {
      setFieldErrors((prev) => ({ ...prev, customerBikeId: "Select your bike for this booking." }));
      setError("Please select your bike before continuing.");
      return;
    }

    const distanceKmValue = parseDistance(distanceKm);
    const addOnsCents = parseZarCents(addOns);
    const consumablesCents = parseZarCents(consumables);
    const partsCents = parseZarCents(parts);
    const bike = bikes.find((entry) => entry.id === customerBikeId);
    const preferredMechanic = mechanics.find((entry) => entry.id === preferredMechanicId);

    const payload: BookingDraft = {
      itemType: selectionType,
      itemId: selection.id,
      itemName: selection.name,
      durationMinutes: selection.durationMinutes,
      priceCents: selection.priceCents,
      customerName,
      customerPhone,
      customerBikeId: customerBikeId || undefined,
      customerBikeLabel: bike ? bikeLabel(bike) : undefined,
      preferredMechanicId: preferredMechanicId || undefined,
      preferredMechanicName: preferredMechanic ? preferredMechanic.name || preferredMechanic.phone : undefined,
      addressText,
      notes,
      distanceKm: distanceKmValue,
      addOnsCents,
      consumablesCents,
      partsCents,
      afterHours
    };
    setSubmitting(true);
    safeSetItem("bookingDraft", JSON.stringify(payload));
    router.push("/book/slot");
  }

  return (
    <Container>
      <PublicHeroBanner

        eyebrow="Online Booking"
        title="Share your booking details"
        description="Add your contact and service location so we can confirm your slot."
      />
      <Stepper
        current={1}
        steps={["Select service", "Your details", "Choose slot", "Review", "Confirmation"]}
      />
      <div className="bg-card rounded-xl border border-border p-5">
        <h1 className="font-display font-bold text-foreground text-lg mb-4">Booking details</h1>
        {catalogLoading ? (
          <div className="flex flex-col gap-3">
            <div className="h-5 w-3/5 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-4/5 rounded-md bg-muted animate-pulse" />
            <div className="h-11 w-full rounded-lg bg-muted animate-pulse" />
            <div className="h-11 w-full rounded-lg bg-muted animate-pulse" />
            <div className="h-11 w-full rounded-lg bg-muted animate-pulse" />
          </div>
        ) : catalogError ? (
          <div>
            <p className="text-sm text-destructive">{catalogError}</p>
            <Button variant="outline" className="mt-3" onClick={loadCatalog}>Retry</Button>
          </div>
        ) : null}
        {!catalogLoading && !catalogError ? (
        <>
        <p>
          {selection ? selection.name : "Unknown service"} — share your details so we can
          confirm your appointment and arrive prepared.
        </p>
        <p className="mt-8">
          You can add optional pricing inputs if you already know them. If not, leave them blank
          and we will confirm later.
        </p>
        <form onSubmit={onSubmit}>
          <LabeledInput
            label="Full name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            helperText="As it should appear on the booking."
            error={fieldErrors.customerName}
          />
          <PhoneInput
            label="Phone"
            value={customerPhone}
            onChange={setCustomerPhone}
            helperText="We will confirm your booking via WhatsApp or phone."
            error={fieldErrors.customerPhone}
          />
          {isClientSession ? (
            bikes.length > 0 ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Bike</label>
                <select
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                {fieldErrors.customerBikeId ? <span className="text-xs text-destructive">{fieldErrors.customerBikeId}</span> : null}
              </div>
            ) : (
              <div className="rounded-lg border border-border p-3 mt-3">
                <p className="text-sm">No saved bikes found for your profile.</p>
                <a href="/app/bikes" className="text-sm text-primary hover:underline font-medium">Add bike in profile</a>
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground mt-3">Log in as a client to select a saved bike.</p>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Preferred mechanic (optional)</label>
            <select
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
          <LabeledInput
            label="Service address"
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            helperText="Street address or complex name."
            error={fieldErrors.addressText}
          />
          <LabeledInput
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            helperText="Gate codes, parking tips, or bike notes."
          />
          <div className="rounded-lg border border-border p-4 mt-4">
            <strong className="text-sm font-semibold text-foreground">Optional pricing inputs</strong>
            <p className="text-sm text-muted-foreground mt-1">
              These help estimate travel and extras. You can skip them if unsure.
            </p>
            <LabeledInput
              label="Approx. distance (km)"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 12.5"
              helperText="Used for the travel fee estimate."
            />
            <LabeledInput
              label="Add-ons total (ZAR)"
              value={addOns}
              onChange={(e) => setAddOns(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 150"
              helperText="For upgrades like chain, cassette, or extra services."
            />
            <LabeledInput
              label="Consumables total (ZAR)"
              value={consumables}
              onChange={(e) => setConsumables(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 80"
              helperText="Lubricants, cleaning supplies, or small parts."
            />
            <LabeledInput
              label="Parts total (ZAR)"
              value={parts}
              onChange={(e) => setParts(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 400"
              helperText="If you already know replacement parts costs."
            />
            <label className="flex items-center gap-2 text-sm mt-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={afterHours}
                onChange={(event) => setAfterHours(event.target.checked)}
              />
              After-hours service (evenings or weekends)
            </label>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={submitting}>
            {submitting ? "Saving..." : "Continue to slots"}
          </Button>
        </form>
        </>
        ) : null}
      </div>
    </Container>
  );
}
