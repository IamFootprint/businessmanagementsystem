"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
type ServiceItem = {
  id: string;
  name: string;
  durationMinutes?: number;
  priceCents?: number;
};

type ClientBike = {
  id: string;
  bikeType: string;
  brand: string;
  model?: string | null;
  eBike?: boolean;
};

type CatalogResponse = {
  services: ServiceItem[];
  packages: ServiceItem[];
};

function bikeLabel(bike: ClientBike) {
  const parts = [bike.brand, bike.model || "", bike.bikeType].filter(Boolean);
  const label = parts.join(" ");
  return bike.eBike ? `${label} (e-bike)` : label;
}

function minSlotIso() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

export default function MechNewBookingPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [clientProfileId, setClientProfileId] = useState<string | null>(null);
  const [clientBikes, setClientBikes] = useState<ClientBike[]>([]);
  const [showRegister, setShowRegister] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerBikeId: "",
    itemType: "service" as "service" | "package",
    itemId: "",
    addressLine1: "",
    suburb: "",
    city: "",
    notes: "",
    slotLocal: minSlotIso()
  });

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch("/api/public/catalog");
        const data = await res.json() as CatalogResponse;
        const serviceList = data.services || [];
        const packageList = data.packages || [];
        setServices(serviceList);
        setPackages(packageList);
        if (serviceList[0]) {
          setForm((prev) => ({ ...prev, itemId: prev.itemId || serviceList[0].id }));
        }
      } catch {
        setServices([]);
        setPackages([]);
      }
    }
    loadServices();
  }, []);

  useEffect(() => {
    setForm((prev) => {
      const pool = prev.itemType === "service" ? services : packages;
      return { ...prev, itemId: pool[0]?.id || "" };
    });
  }, [services, packages]);

  function resetClientLookup() {
    setClientProfileId(null);
    setClientBikes([]);
    setLookupMessage(null);
    setShowRegister(false);
    setRegisterName("");
    setForm((prev) => ({ ...prev, customerBikeId: "" }));
  }

  async function lookupClient() {
    setLookupBusy(true);
    setLookupMessage(null);
    resetClientLookup();
    try {
      const res = await fetch(`/api/mech/clients/search?phone=${encodeURIComponent(form.customerPhone)}`);
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && String(raw?.error?.message || raw?.error || "").toLowerCase().includes("complete profile")) {
          window.location.href = "/mech/profile";
          return;
        }
        if (res.status === 404) {
          setShowRegister(true);
          setRegisterName(form.customerName);
          setLookupMessage(null);
        } else {
          setLookupMessage(raw?.error?.message || "Client not found.");
        }
        return;
      }
      const data = raw.data ?? raw;
      setClientProfileId(data.client?.id || null);
      setClientBikes(data.bikes || []);
      setForm((prev) => ({
        ...prev,
        customerName: data.client?.name || prev.customerName,
        customerBikeId: data.bikes?.[0]?.id || ""
      }));
      setLookupMessage((data.bikes || []).length > 0 ? "Client found. Select the bike for this booking." : "Client found. No bikes yet.");
    } catch {
      setLookupMessage("Client lookup failed.");
    } finally {
      setLookupBusy(false);
    }
  }

  async function registerClient() {
    setRegistering(true);
    setLookupMessage(null);
    try {
      const res = await fetch("/api/mech/clients/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.customerPhone, name: registerName })
      });
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLookupMessage(raw?.error?.message || "Failed to register customer.");
        return;
      }
      const data = raw.data ?? raw;
      setClientProfileId(data.client?.id || null);
      setForm(prev => ({ ...prev, customerName: data.client?.name || registerName }));
      setClientBikes([]);
      setShowRegister(false);
      setLookupMessage(data.alreadyExists ? "Existing client found." : "Customer registered successfully. Continue with the booking.");
    } catch {
      setLookupMessage("Failed to register customer.");
    } finally {
      setRegistering(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    if (!clientProfileId) {
      setError("Search and select a registered client first.");
      setLoading(false);
      return;
    }
    if (clientBikes.length > 0 && !form.customerBikeId) {
      setError("Select the client's bike.");
      setLoading(false);
      return;
    }
    try {
      const payload = {
        ...form,
        slotIso: new Date(form.slotLocal).toISOString()
      };
      const res = await fetch("/api/mech/bookings/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && String(raw?.error?.message || raw?.error || "").toLowerCase().includes("complete profile")) {
          window.location.href = "/mech/profile";
          return;
        }
        setError(raw?.error?.message || "Failed to create booking.");
        return;
      }
      const data = raw.data ?? raw;
      setSuccess(`Booking ${data.booking?.ref || ""} created and assigned to your queue.`);
      if (data.jobCard?.id) {
        setTimeout(() => {
          window.location.href = `/mech/job/${data.jobCard.id}`;
        }, 700);
      }
    } catch {
      setError("Failed to create booking.");
    } finally {
      setLoading(false);
    }
  }

  const selectClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const inputFieldClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-foreground text-lg">Add customer booking</h2>
        <p className="text-sm text-muted-foreground mb-4">Create a confirmed booking and immediately add it to your planned schedule.</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <LabeledInput
                label="Customer phone"
                value={form.customerPhone}
                onChange={(event) => {
                  const nextPhone = event.target.value;
                  setForm((prev) => ({ ...prev, customerPhone: nextPhone }));
                  resetClientLookup();
                }}
              />
            </div>
            <Button className="w-full sm:w-auto min-h-[44px]" variant="outline" type="button" onClick={lookupClient} disabled={!form.customerPhone || lookupBusy}>
              {lookupBusy ? "Searching..." : "Find client"}
            </Button>
          </div>
          {lookupMessage ? <p className="text-sm text-muted-foreground">{lookupMessage}</p> : null}
          {showRegister && !clientProfileId ? (
            <div className="rounded-lg border border-border p-4 mt-3">
              <p className="text-sm font-semibold text-foreground mb-1">Customer not found</p>
              <p className="text-sm text-muted-foreground mb-3">Register this phone number as a new customer to continue.</p>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <div className="flex-1">
                  <LabeledInput label="Customer name" value={registerName} onChange={(e) => setRegisterName(e.target.value)} />
                </div>
                <Button className="w-full sm:w-auto min-h-[44px]" type="button" onClick={registerClient} disabled={registering || !registerName.trim()}>
                  {registering ? "Registering..." : "Register & continue"}
                </Button>
              </div>
            </div>
          ) : null}
          <LabeledInput
            label="Customer name"
            value={form.customerName}
            onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))}
          />
          {clientBikes.length > 0 ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Client bike</label>
              <select
                className={selectClass}
                value={form.customerBikeId}
                onChange={(event) => setForm((prev) => ({ ...prev, customerBikeId: event.target.value }))}
              >
                <option value="">Select bike</option>
                {clientBikes.map((bike) => (
                  <option key={bike.id} value={bike.id}>
                    {bikeLabel(bike)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Item type</label>
            <select
              className={selectClass}
              value={form.itemType}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  itemType: event.target.value as "service" | "package",
                  itemId:
                    (event.target.value === "service" ? services[0]?.id : packages[0]?.id) || ""
                }))
              }
            >
              <option value="service">Service</option>
              <option value="package">Package</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{form.itemType === "service" ? "Service" : "Package"}</label>
            <select
              className={selectClass}
              value={form.itemId}
              onChange={(event) => setForm((prev) => ({ ...prev, itemId: event.target.value }))}
            >
              {(form.itemType === "service" ? services : packages).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <LabeledInput
            label="Address line 1"
            value={form.addressLine1}
            onChange={(event) => setForm((prev) => ({ ...prev, addressLine1: event.target.value }))}
          />
          <LabeledInput
            label="Suburb"
            value={form.suburb}
            onChange={(event) => setForm((prev) => ({ ...prev, suburb: event.target.value }))}
          />
          <LabeledInput
            label="City"
            value={form.city}
            onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Planned slot</label>
            <input
              className={inputFieldClass}
              type="datetime-local"
              value={form.slotLocal}
              onChange={(event) => setForm((prev) => ({ ...prev, slotLocal: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <textarea
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-y"
              rows={4}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-status-completed">{success}</p> : null}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button className="w-full sm:w-auto min-h-[44px]" disabled={loading}>{loading ? "Creating..." : "Create booking"}</Button>
            <a href="/mech/schedule" className="w-full sm:w-auto">
              <Button className="w-full min-h-[44px]" variant="outline">Back to schedule</Button>
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
