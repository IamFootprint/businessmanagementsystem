"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import ActionModal from "@/app/components/ActionModal";
import { formatDateTimeZA } from "@/lib/format/date";

type PlatformShop = {
  id: string;
  shopName: string;
  city: string;
  submittedAt: string;
  status: string;
  createdByPhone: string;
};

export default function PlatformShopsPage() {
  const [shops, setShops] = useState<PlatformShop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── Create modal state ── */
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [city, setCity] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/shops");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Unable to load shop registrations.");
        setShops([]);
        return;
      }
      setShops(data.shops || []);
    } catch {
      setError("Unable to load shop registrations.");
      setShops([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetCreateForm() {
    setShopName("");
    setOwnerPhone("");
    setOwnerName("");
    setCity("");
    setContactEmail("");
    setAddress("");
    setCreateError(null);
  }

  async function createShop() {
    setCreateError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/platform/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName,
          ownerPhone,
          ownerName,
          city: city || undefined,
          contactEmail: contactEmail || undefined,
          address: address || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data?.error?.message || data?.error || "Failed to create shop.");
        return false;
      }
      resetCreateForm();
      await load();
      return true;
    } catch {
      setCreateError("Failed to create shop.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h1>Platform shop approvals</h1>
      <p>Review and approve/reject self-registered bike service shops.</p>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
        <Button
          onClick={() => {
            resetCreateForm();
            setCreateOpen(true);
          }}
        >
          Create shop
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive mt-3">{error}</p> : null}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Shop</th>
              <th>City</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Owner phone</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {!loading && shops.length === 0 ? (
              <tr>
                <td colSpan={6}>No shop submissions found.</td>
              </tr>
            ) : null}
            {shops.map((shop) => (
              <tr key={shop.id}>
                <td>{shop.shopName}</td>
                <td>{shop.city || "-"}</td>
                <td>{formatDateTimeZA(shop.submittedAt)}</td>
                <td>{shop.status}</td>
                <td>{shop.createdByPhone || "-"}</td>
                <td>
                  <a href={`/admin/platform/shops/${shop.id}`}>
                    <Button variant="outline">Review</Button>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ActionModal
        open={createOpen}
        title="Create shop for partner"
        description="Create a new pre-approved shop and assign an owner."
        onClose={() => {
          if (saving) return;
          setCreateOpen(false);
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabeledInput
              label="Shop name"
              value={shopName}
              onChange={(event) => setShopName(event.target.value)}
            />
            <LabeledInput
              label="Owner phone"
              value={ownerPhone}
              onChange={(event) => setOwnerPhone(event.target.value)}
              placeholder="+27..."
            />
            <LabeledInput
              label="Owner name"
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
            />
            <LabeledInput
              label="City"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
            <LabeledInput
              label="Contact email"
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
            />
            <LabeledInput
              label="Address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>
          {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const ok = await createShop();
                if (ok) setCreateOpen(false);
              }}
              disabled={saving || !shopName || !ownerPhone || !ownerName}
            >
              {saving ? "Creating..." : "Create shop"}
            </Button>
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
