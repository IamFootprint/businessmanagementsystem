"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
type CatalogItem = {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
};

type ClientBike = {
  id: string;
  bikeType: string;
  brand: string;
  model?: string | null;
  eBike?: boolean;
};

type Mechanic = {
  id: string;
  name?: string | null;
  phone: string;
  status: string;
};

function bikeLabel(bike: ClientBike) {
  const parts = [bike.brand, bike.model || "", bike.bikeType].filter(Boolean);
  const label = parts.join(" ");
  return bike.eBike ? `${label} (e-bike)` : label;
}

const selectClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export default function AdminBookingNewPage() {
  const [services, setServices] = useState<CatalogItem[]>([]);
  const [packages, setPackages] = useState<CatalogItem[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [itemType, setItemType] = useState<"service" | "package">("service");
  const [itemId, setItemId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [clientProfileId, setClientProfileId] = useState<string | null>(null);
  const [clientBikes, setClientBikes] = useState<ClientBike[]>([]);
  const [customerBikeId, setCustomerBikeId] = useState("");
  const [preferredMechanicId, setPreferredMechanicId] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [addressLine1, setAddressLine1] = useState("");
  const [suburb, setSuburb] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [slotIso, setSlotIso] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [catalogRes, mechanicsRes] = await Promise.all([
        fetch("/api/public/catalog"),
        fetch("/api/admin/mechanics")
      ]);
      const catalog = await catalogRes.json();
      const mechRaw = await mechanicsRes.json().catch(() => ({}));
      const mechData = mechRaw.data ?? mechRaw;
      setServices(catalog.services || []);
      setPackages(catalog.packages || []);
      setMechanics((mechData.mechanics || []).filter((item: Mechanic) => item.status === "ACTIVE"));
      const initialService = catalog.services?.[0]?.id || "";
      setItemId(initialService);
    }
    load();
  }, []);

  useEffect(() => {
    const next =
      itemType === "service"
        ? (services[0]?.id || "")
        : (packages[0]?.id || "");
    setItemId(next);
  }, [itemType, services, packages]);

  function resetClientLookup() {
    setClientProfileId(null);
    setClientBikes([]);
    setCustomerBikeId("");
    setLookupMessage(null);
  }

  async function lookupClient() {
    setLookupBusy(true);
    setLookupMessage(null);
    resetClientLookup();
    try {
      const res = await fetch(`/api/admin/clients/search?phone=${encodeURIComponent(customerPhone)}`);
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLookupMessage(raw?.error || "Client not found.");
        return;
      }
      const data = raw.data ?? raw;
      setClientProfileId(data.client?.id || null);
      setCustomerName(data.client?.name || customerName);
      const bikes = data.bikes || [];
      setClientBikes(bikes);
      if (bikes[0]) {
        setCustomerBikeId(bikes[0].id);
      }
      setLookupMessage(bikes.length > 0 ? "Client found. Select a bike and continue." : "Client found. No bikes yet.");
    } catch {
      setLookupMessage("Client lookup failed.");
    } finally {
      setLookupBusy(false);
    }
  }

  async function submit() {
    setMessage(null);
    setError(null);
    if (!clientProfileId) {
      setError("Search and select a registered client first.");
      return;
    }
    if (clientBikes.length > 0 && !customerBikeId) {
      setError("Select the client's bike for this booking.");
      return;
    }
    const iso = slotIso ? new Date(slotIso).toISOString() : "";
    const res = await fetch("/api/admin/bookings/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        customerPhone,
        itemType,
        itemId,
        customerBikeId: customerBikeId || undefined,
        preferredMechanicId: preferredMechanicId || undefined,
        addressLine1,
        suburb,
        city,
        notes,
        slotIso: iso
      })
    });
    const raw = await res.json();
    if (!res.ok) {
      setMessage(raw?.error || "Unable to create booking.");
      return;
    }
    const data = raw.data ?? raw;
    setMessage(`Booking created: ${data.booking?.ref || data.booking?.referenceCode || data.booking?.id} / Job card: ${data.jobCard?.ref || "-"}`);
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h1 className="font-display font-bold text-foreground text-lg mb-1">Create booking</h1>
      <p className="text-sm text-muted-foreground mb-4">Book a service on behalf of a customer.</p>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <LabeledInput label="Customer phone" value={customerPhone} onChange={(e) => {
            setCustomerPhone(e.target.value);
            resetClientLookup();
          }} />
        </div>
        <Button variant="outline" className="mb-0.5" onClick={lookupClient} disabled={!customerPhone || lookupBusy}>
          {lookupBusy ? "Searching..." : "Find client"}
        </Button>
      </div>
      {lookupMessage ? <p className="text-sm text-muted-foreground mt-2">{lookupMessage}</p> : null}
      <LabeledInput label="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
      {clientBikes.length > 0 ? (
        <div className="space-y-1.5 mt-3">
          <label className="text-sm font-medium text-foreground">Client bike</label>
          <select className={selectClass} value={customerBikeId} onChange={(e) => setCustomerBikeId(e.target.value)}>
            <option value="">Select bike</option>
            {clientBikes.map((bike) => (
              <option key={bike.id} value={bike.id}>
                {bikeLabel(bike)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="space-y-1.5 mt-3">
        <label className="text-sm font-medium text-foreground">Preferred mechanic (optional)</label>
        <select
          className={selectClass}
          value={preferredMechanicId}
          onChange={(e) => setPreferredMechanicId(e.target.value)}
        >
          <option value="">No preference</option>
          {mechanics.map((mechanic) => (
            <option key={mechanic.id} value={mechanic.id}>
              {mechanic.name || mechanic.phone}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5 mt-3">
        <label className="text-sm font-medium text-foreground">Item type</label>
        <select
          className={selectClass}
          value={itemType}
          onChange={(e) => setItemType(e.target.value as "service" | "package")}
        >
          <option value="service">Service</option>
          <option value="package">Package</option>
        </select>
      </div>
      <div className="space-y-1.5 mt-3">
        <label className="text-sm font-medium text-foreground">{itemType === "service" ? "Service" : "Package"}</label>
        <select
          className={selectClass}
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
        >
          <option value="">
            {itemType === "service" ? "Select service" : "Select package"}
          </option>
          {(itemType === "service" ? services : packages).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <LabeledInput label="Address line" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <LabeledInput label="Suburb" value={suburb} onChange={(e) => setSuburb(e.target.value)} />
        <LabeledInput label="City" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <LabeledInput label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <LabeledInput
        label="Slot (ISO datetime)"
        type="datetime-local"
        value={slotIso}
        onChange={(e) => setSlotIso(e.target.value)}
      />
      <div className="mt-4">
        <Button
          onClick={submit}
          disabled={!itemId || !customerName || !customerPhone || !addressLine1 || !slotIso || !clientProfileId}
        >
          Create booking
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive mt-3">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground mt-3">{message}</p> : null}
    </div>
  );
}
