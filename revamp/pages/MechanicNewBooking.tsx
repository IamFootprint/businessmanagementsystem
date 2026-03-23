import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkspaceShell } from "@/revamp/components/WorkspaceShell";
import { MECH_NAV_GROUPS } from "@/revamp/lib/navigation";
import { Button } from "@/revamp/components/ui/button";
import { Input } from "@/revamp/components/ui/input";
import { Textarea } from "@/revamp/components/ui/textarea";
import { useToast } from "@/revamp/hooks/use-toast";
import { User, Bike, MapPin, CheckCircle2 } from "lucide-react";
import { cn } from "@/revamp/lib/utils";
import { apiFetch } from "@/lib/client/api";
import { formatBikeLabel, formatZarFromCents } from "@/revamp/lib/formatters";
import { PhoneField } from "@/revamp/components/PhoneField";
import { validateE164 } from "@/lib/auth/phone";

type ServiceOption = {
  id: string;
  name: string;
  description?: string;
  priceCents?: number;
  durationMinutes?: number;
};

type ClientBike = {
  id: string;
  bikeType: string;
  brand: string;
  model?: string | null;
  eBike?: boolean;
};

type LookupResult = {
  client?: {
    id: string;
    name?: string;
    phone: string;
  };
  bikes?: ClientBike[];
};

function minSlotLocal() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

export default function MechanicNewBooking() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdRef, setCreatedRef] = useState("");
  const [createdJobCardId, setCreatedJobCardId] = useState("");
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [clientFound, setClientFound] = useState(false);
  const [clientBikes, setClientBikes] = useState<ClientBike[]>([]);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerBikeId: "",
    selectedServiceId: "",
    addressLine1: "",
    suburb: "",
    city: "",
    notes: "",
    slotLocal: minSlotLocal(),
  });

  useEffect(() => {
    let ignore = false;

    async function loadServices() {
      setLoadingServices(true);
      try {
        const data = await apiFetch<{ services: ServiceOption[] }>("/api/public/catalog/services");
        if (ignore) return;
        const serviceList = data.services || [];
        setServices(serviceList);
        if (serviceList[0]) {
          setForm((prev) => ({ ...prev, selectedServiceId: prev.selectedServiceId || serviceList[0].id }));
        }
      } catch {
        if (ignore) return;
        setServices([]);
      } finally {
        if (!ignore) setLoadingServices(false);
      }
    }

    void loadServices();
    return () => {
      ignore = true;
    };
  }, []);

  function resetLookup() {
    setClientFound(false);
    setClientBikes([]);
    setLookupMessage(null);
    setForm((prev) => ({ ...prev, customerBikeId: "" }));
  }

  async function lookupClient() {
    if (!validateE164(form.customerPhone.trim())) return;
    setLookupBusy(true);
    setLookupMessage(null);
    setClientFound(false);
    try {
      const data = await apiFetch<LookupResult>(`/api/mech/clients/search?phone=${encodeURIComponent(form.customerPhone.trim())}`);
      setClientFound(Boolean(data.client?.id));
      setClientBikes(data.bikes || []);
      setForm((prev) => ({
        ...prev,
        customerName: data.client?.name || prev.customerName,
        customerBikeId: (data.bikes || [])[0]?.id || "",
      }));
      setLookupMessage((data.bikes || []).length > 0 ? "Client found. Select their bike." : "Client found. No bike on file.");
    } catch (lookupError) {
      const nextMessage = lookupError instanceof Error ? lookupError.message : "Client lookup failed.";
      setLookupMessage(nextMessage);
      setClientFound(false);
      setClientBikes([]);
    } finally {
      setLookupBusy(false);
    }
  }

  const selectedService = useMemo(() => {
    return services.find((service) => service.id === form.selectedServiceId) || null;
  }, [services, form.selectedServiceId]);

  async function createBooking() {
    if (!clientFound) {
      toast({ title: "Client required", description: "Lookup the client by phone first." });
      return;
    }
    if (!form.selectedServiceId) {
      toast({ title: "Service required", description: "Select a service before creating the booking." });
      return;
    }
    setCreating(true);
    try {
      const data = await apiFetch<{ booking: { ref: string }; jobCard?: { id: string } }>("/api/mech/bookings/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          customerBikeId: form.customerBikeId || undefined,
          itemId: form.selectedServiceId,
          itemType: "service",
          addressLine1: form.addressLine1.trim(),
          suburb: form.suburb.trim() || undefined,
          city: form.city.trim() || undefined,
          notes: form.notes.trim() || undefined,
          slotIso: new Date(form.slotLocal).toISOString(),
        }),
      });
      setCreatedRef(data.booking?.ref || "");
      setCreatedJobCardId(data.jobCard?.id || "");
      setSubmitted(true);
      toast({ title: "Booking created", description: `Booking ${data.booking?.ref || ""} added.` });
    } catch (createError) {
      const nextMessage = createError instanceof Error ? createError.message : "Failed to create booking.";
      toast({ title: "Booking failed", description: nextMessage });
    } finally {
      setCreating(false);
    }
  }

  if (submitted) {
    return (
      <WorkspaceShell navGroups={MECH_NAV_GROUPS} title="New Booking">
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-full bg-status-completed/15 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-status-completed" />
          </div>
          <h2 className="font-display font-bold text-lg text-foreground">Walk-in Booked</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Booking {createdRef || ""} has been created and added to your schedule.
          </p>
          <div className="flex gap-3 mt-6 justify-center">
            {createdJobCardId ? (
              <Button onClick={() => navigate(`/mech/job/${createdJobCardId}`)}>Open Job Card</Button>
            ) : (
              <Button onClick={() => navigate("/mech")}>Back to Today</Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false);
                setCreatedRef("");
                setCreatedJobCardId("");
                resetLookup();
              }}
            >
              Add Another
            </Button>
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell navGroups={MECH_NAV_GROUPS} title="New Booking">
      <div className="stack-lg max-w-2xl">
        <div>
          <h1 className="text-lg font-display font-bold text-foreground">Capture Walk-in</h1>
          <p className="text-sm text-muted-foreground">Create a booking for an existing client profile.</p>
        </div>

        <div className="panel-padded stack">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Customer</p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <PhoneField
                label="Phone Number"
                value={form.customerPhone}
                onChange={(nextPhone) => {
                  setForm((prev) => ({ ...prev, customerPhone: nextPhone }));
                  resetLookup();
                }}
                helperText="Use country code format."
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void lookupClient()}
              disabled={!validateE164(form.customerPhone.trim()) || lookupBusy}
            >
              {lookupBusy ? "Searching..." : "Find Client"}
            </Button>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Name</label>
            <Input
              placeholder="Client name"
              value={form.customerName}
              onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))}
            />
          </div>
          {lookupMessage ? <p className="text-xs text-muted-foreground">{lookupMessage}</p> : null}
          {clientBikes.length > 0 ? (
            <div>
              <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5"><Bike className="w-3.5 h-3.5" /> Bike</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.customerBikeId}
                onChange={(event) => setForm((prev) => ({ ...prev, customerBikeId: event.target.value }))}
              >
                <option value="">Select bike</option>
                {clientBikes.map((bike) => (
                  <option key={bike.id} value={bike.id}>
                    {formatBikeLabel(bike)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="panel-padded stack">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Service</p>
          {loadingServices ? (
            <p className="text-sm text-muted-foreground">Loading services...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setForm((prev) => ({ ...prev, selectedServiceId: service.id }))}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    form.selectedServiceId === service.id ? "border-primary bg-secondary/50" : "border-border bg-card hover:bg-muted/30"
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{service.name}</p>
                  <p className="text-xs font-bold text-primary mt-0.5">{formatZarFromCents(service.priceCents)}</p>
                </button>
              ))}
            </div>
          )}
          {selectedService?.description ? (
            <p className="text-xs text-muted-foreground">{selectedService.description}</p>
          ) : null}
        </div>

        <div className="panel-padded stack">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location & Slot</p>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Address</label>
            <Input
              placeholder="Address line 1"
              value={form.addressLine1}
              onChange={(event) => setForm((prev) => ({ ...prev, addressLine1: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Suburb"
              value={form.suburb}
              onChange={(event) => setForm((prev) => ({ ...prev, suburb: event.target.value }))}
            />
            <Input
              placeholder="City"
              value={form.city}
              onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
            />
          </div>
          <Input
            type="datetime-local"
            value={form.slotLocal}
            onChange={(event) => setForm((prev) => ({ ...prev, slotLocal: event.target.value }))}
          />
        </div>

        <div className="panel-padded stack">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Notes</p>
          <Textarea
            placeholder="Any additional notes about the bike condition..."
            rows={3}
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={() => void createBooking()}
          disabled={creating || !clientFound || !validateE164(form.customerPhone.trim()) || !form.selectedServiceId || !form.addressLine1.trim()}
        >
          {creating ? "Creating..." : "Create Booking"}
        </Button>
      </div>
    </WorkspaceShell>
  );
}
