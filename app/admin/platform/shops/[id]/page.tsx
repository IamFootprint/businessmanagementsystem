"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import RecordActionButton from "@/app/components/RecordActionButton";
import { formatDateTimeZA } from "@/lib/format/date";
type ShopDetail = {
  id: string;
  name: string;
  slug: string;
  shopStatus: string;
  customDomains?: string[];
  submittedAtIso?: string;
  businessDetails?: {
    name?: string;
    address?: string;
    city?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
    vat?: string;
  };
  operationalDefaults?: {
    noticeHours: number;
    assignmentMode: string;
    workingHours: Array<{ day: string; start: string; end: string; active: boolean }>;
  };
  serviceModels?: {
    fixedLocation: {
      enabled: boolean;
      dropOffInstructions?: string;
      parkingAvailability?: "YES" | "LIMITED" | "NO";
      operatingBays?: number;
    };
    mobileMechanic: {
      enabled: boolean;
      serviceRadiusKm?: number;
      calloutFeeCents?: number;
      travelBufferMins?: number;
      serviceAreas?: string[];
    };
  };
};

export default function PlatformShopDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [owner, setOwner] = useState<{ name?: string; phone?: string; status?: string } | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Domain management state
  const [newDomain, setNewDomain] = useState("");
  const [domainSaving, setDomainSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/shops/${params.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Unable to load shop details.");
        setShop(null);
        setOwner(null);
        return;
      }
      setShop(data.shop || null);
      setOwner(data.owner || null);
    } catch {
      setError("Unable to load shop details.");
      setShop(null);
      setOwner(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params?.id) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  async function approve() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/shops/${params.id}/approve`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Approve failed.");
        return;
      }
      router.push("/admin/platform/shops");
      router.refresh();
    } catch {
      setError("Approve failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function reject() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/shops/${params.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Reject failed.");
        return;
      }
      router.push("/admin/platform/shops");
      router.refresh();
    } catch {
      setError("Reject failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function addDomain() {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;
    setDomainSaving(true);
    setError(null);
    try {
      const current = shop?.customDomains || [];
      if (current.includes(domain)) {
        setError("Domain already added.");
        return;
      }
      const res = await fetch(`/api/platform/shops/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDomains: [...current, domain] })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to add domain.");
        return;
      }
      setNewDomain("");
      void load();
    } catch {
      setError("Failed to add domain.");
    } finally {
      setDomainSaving(false);
    }
  }

  async function removeDomain(domain: string) {
    setDomainSaving(true);
    setError(null);
    try {
      const current = shop?.customDomains || [];
      const res = await fetch(`/api/platform/shops/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDomains: current.filter((d) => d !== domain) })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to remove domain.");
        return;
      }
      void load();
    } catch {
      setError("Failed to remove domain.");
    } finally {
      setDomainSaving(false);
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h1>Shop approval detail</h1>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p>Loading shop details...</p> : null}
      {shop ? (
        <div className="flex flex-col gap-4 mt-3">
          <div className="rounded-lg border border-border p-4">
            <h3>{shop.businessDetails?.name || shop.name}</h3>
            <p>Status: {shop.shopStatus}</p>
            <p>Submitted: {shop.submittedAtIso ? formatDateTimeZA(shop.submittedAtIso) : "-"}</p>
            <p>Address: {shop.businessDetails?.address || "-"}</p>
            <p>City: {shop.businessDetails?.city || "-"}</p>
            <p>Contact: {shop.businessDetails?.contactEmail || "-"} · {shop.businessDetails?.contactPhone || "-"}</p>
            <p>Website: {shop.businessDetails?.website || "-"}</p>
            <p>VAT: {shop.businessDetails?.vat || "-"}</p>
            <p>Owner: {owner?.name || "Owner"} ({owner?.phone || "-"})</p>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h3>Custom domains</h3>
            {(shop.customDomains || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No custom domains configured.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {(shop.customDomains || []).map((domain) => (
                  <div key={domain} className="flex items-center gap-2">
                    <code>{domain}</code>
                    <RecordActionButton
                      action="delete"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      label={`Delete domain ${domain}`}
                      disabled={domainSaving}
                      onClick={() => removeDomain(domain)}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <input
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                type="text"
                placeholder="book.example.co.za"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void addDomain(); }}
              />
              <RecordActionButton
                action="add"
                label="Add domain"
                disabled={domainSaving || !newDomain.trim()}
                onClick={addDomain}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h3>Operational defaults</h3>
            <p>Notice hours: {shop.operationalDefaults?.noticeHours ?? 24}</p>
            <p>Assignment mode: {shop.operationalDefaults?.assignmentMode || "AUTO"}</p>
            <p>Working hours:</p>
            <div className="flex flex-col gap-4">
              {(shop.operationalDefaults?.workingHours || []).map((entry) => (
                <p key={`${entry.day}-${entry.start}`}>{entry.day}: {entry.active ? `${entry.start}-${entry.end}` : "Closed"}</p>
              ))}
            </div>
          </div>
          {shop.serviceModels ? (
            <div className="rounded-lg border border-border p-4">
              <h3>Service models</h3>
              <div className="flex flex-col gap-3 mt-2">
                <div className="rounded border border-border p-3">
                  <p className="font-medium">
                    Fixed location:{" "}
                    <span className={shop.serviceModels.fixedLocation.enabled ? "text-green-600" : "text-muted-foreground"}>
                      {shop.serviceModels.fixedLocation.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </p>
                  {shop.serviceModels.fixedLocation.enabled && (
                    <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                      {shop.serviceModels.fixedLocation.dropOffInstructions && (
                        <p>Drop-off instructions: {shop.serviceModels.fixedLocation.dropOffInstructions}</p>
                      )}
                      <p>Parking: {shop.serviceModels.fixedLocation.parkingAvailability || "YES"}</p>
                      <p>Operating bays: {shop.serviceModels.fixedLocation.operatingBays || 1}</p>
                    </div>
                  )}
                </div>
                <div className="rounded border border-border p-3">
                  <p className="font-medium">
                    Mobile mechanic:{" "}
                    <span className={shop.serviceModels.mobileMechanic.enabled ? "text-green-600" : "text-muted-foreground"}>
                      {shop.serviceModels.mobileMechanic.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </p>
                  {shop.serviceModels.mobileMechanic.enabled && (
                    <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                      <p>Service radius: {shop.serviceModels.mobileMechanic.serviceRadiusKm || 25} km</p>
                      <p>Callout fee: R{((shop.serviceModels.mobileMechanic.calloutFeeCents || 0) / 100).toFixed(2)}</p>
                      <p>Travel buffer: {shop.serviceModels.mobileMechanic.travelBufferMins || 15} min</p>
                      {(shop.serviceModels.mobileMechanic.serviceAreas || []).length > 0 && (
                        <p>Service areas: {shop.serviceModels.mobileMechanic.serviceAreas!.join(", ")}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Rejection reason (optional)</span>
            <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]" value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/admin/platform/shops")}>
              Back
            </Button>
            <Button disabled={submitting} onClick={reject} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
              {submitting ? "Processing..." : "Reject shop"}
            </Button>
            <Button disabled={submitting} onClick={approve}>
              {submitting ? "Processing..." : "Approve shop"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
