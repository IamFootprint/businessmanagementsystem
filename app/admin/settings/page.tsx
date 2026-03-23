"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { useAdminUi } from "../admin-ui";
import ActionModal from "@/app/components/ActionModal";
type Shop = {
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  baseLocation?: string | null;
  themeTokens?: {
    brandTagline?: string;
    logoUrl?: string;
    heroImageUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    headerBg?: string;
    surfaceColor?: string;
    textColor?: string;
    ctaLabel?: string;
  };
};

export default function SettingsPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState<"shop" | "theme" | null>(null);
  const { canEdit, reason } = useAdminUi();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/settings/shop");
        const raw = await res.json();
        const data = raw.data ?? raw;
        setShop(data.shop);
      } catch {
        setError("Failed to load shop settings.");
      }
    }
    load();
  }, []);

  if (!shop) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <h1 className="font-display font-bold text-foreground text-lg mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground">{error || "Loading..."}</p>
      </div>
    );
  }

  async function saveSettings() {
    if (!canEdit) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/shop", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shop)
      });
      if (!res.ok) throw new Error("save failed");
      return true;
    } catch {
      setError("Failed to save shop settings.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display font-bold text-foreground text-lg mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-4">Update one capability at a time from the sections below.</p>
      {!canEdit ? (
        <div className="text-sm p-3 rounded-lg mb-4 bg-muted text-muted-foreground">
          {reason || "Read-only access: settings changes are disabled."}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-foreground mb-1">Shop details</h2>
          <p className="text-sm text-muted-foreground mb-3">Name, contact channels, and base location for customer communications.</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Name</span><strong className="text-foreground">{shop.name}</strong></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Phone</span><span className="text-foreground">{shop.phone || "Not set"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">WhatsApp</span><span className="text-foreground">{shop.whatsapp || "Not set"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Email</span><span className="text-foreground">{shop.email || "Not set"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Base location</span><span className="text-foreground">{shop.baseLocation || "Not set"}</span></div>
          </div>
          {canEdit ? (
            <Button className="mt-4" onClick={() => setActiveModal("shop")}>Edit shop details</Button>
          ) : null}
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-foreground mb-1">Whitelabel theme</h2>
          <p className="text-sm text-muted-foreground mb-3">Branding tokens for logo, hero, colors, and default CTA copy.</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Tagline</span><span className="text-foreground">{shop.themeTokens?.brandTagline || "Not set"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Logo</span><span className="text-foreground">{shop.themeTokens?.logoUrl ? "Configured" : "Not set"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Hero image</span><span className="text-foreground">{shop.themeTokens?.heroImageUrl ? "Configured" : "Not set"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Primary CTA</span><span className="text-foreground">{shop.themeTokens?.ctaLabel || "Book a service"}</span></div>
          </div>
          {canEdit ? (
            <Button className="mt-4" onClick={() => setActiveModal("theme")}>Edit whitelabel theme</Button>
          ) : null}
        </div>
      </div>

      <ActionModal
        open={activeModal === "shop"}
        title="Shop details"
        description="Update contact and profile details without opening theme controls."
        onClose={() => {
          if (saving) return;
          setActiveModal(null);
        }}
      >
        <div className="flex flex-col gap-4">
          <LabeledInput label="Shop name" value={shop.name} onChange={(e) => setShop({ ...shop, name: e.target.value })} />
          <LabeledInput label="Phone" value={shop.phone || ""} onChange={(e) => setShop({ ...shop, phone: e.target.value })} />
          <LabeledInput
            label="WhatsApp"
            value={shop.whatsapp || ""}
            onChange={(e) => setShop({ ...shop, whatsapp: e.target.value })}
          />
          <LabeledInput
            label="Email"
            value={shop.email || ""}
            onChange={(e) => setShop({ ...shop, email: e.target.value })}
          />
          <LabeledInput
            label="Base location"
            value={shop.baseLocation || ""}
            onChange={(e) => setShop({ ...shop, baseLocation: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setActiveModal(null)} disabled={saving}>Exit</Button>
            <Button
              disabled={saving}
              onClick={async () => {
                const ok = await saveSettings();
                if (ok) setActiveModal(null);
              }}
            >
              {saving ? "Saving..." : "Save details"}
            </Button>
          </div>
        </div>
      </ActionModal>

      <ActionModal
        open={activeModal === "theme"}
        title="Whitelabel theme"
        description="Adjust branding tokens in one focused capture flow."
        onClose={() => {
          if (saving) return;
          setActiveModal(null);
        }}
      >
        <div className="flex flex-col gap-4">
          <LabeledInput
            label="Brand tagline"
            value={shop.themeTokens?.brandTagline || ""}
            onChange={(e) =>
              setShop({
                ...shop,
                themeTokens: { ...(shop.themeTokens || {}), brandTagline: e.target.value }
              })
            }
          />
          <LabeledInput
            label="Logo URL"
            value={shop.themeTokens?.logoUrl || ""}
            onChange={(e) =>
              setShop({
                ...shop,
                themeTokens: { ...(shop.themeTokens || {}), logoUrl: e.target.value }
              })
            }
          />
          <LabeledInput
            label="Hero image URL"
            value={shop.themeTokens?.heroImageUrl || ""}
            onChange={(e) =>
              setShop({
                ...shop,
                themeTokens: { ...(shop.themeTokens || {}), heroImageUrl: e.target.value }
              })
            }
          />
          <LabeledInput
            label="Primary color (hex)"
            value={shop.themeTokens?.primaryColor || ""}
            onChange={(e) =>
              setShop({
                ...shop,
                themeTokens: { ...(shop.themeTokens || {}), primaryColor: e.target.value }
              })
            }
            placeholder="#7C4FE0"
          />
          <LabeledInput
            label="Accent color (hex)"
            value={shop.themeTokens?.accentColor || ""}
            onChange={(e) =>
              setShop({
                ...shop,
                themeTokens: { ...(shop.themeTokens || {}), accentColor: e.target.value }
              })
            }
            placeholder="#46CAD7"
          />
          <LabeledInput
            label="Header background (hex)"
            value={shop.themeTokens?.headerBg || ""}
            onChange={(e) =>
              setShop({
                ...shop,
                themeTokens: { ...(shop.themeTokens || {}), headerBg: e.target.value }
              })
            }
            placeholder="#ECF0F6"
          />
          <LabeledInput
            label="Surface color (hex)"
            value={shop.themeTokens?.surfaceColor || ""}
            onChange={(e) =>
              setShop({
                ...shop,
                themeTokens: { ...(shop.themeTokens || {}), surfaceColor: e.target.value }
              })
            }
            placeholder="#FFFFFF"
          />
          <LabeledInput
            label="Text color (hex)"
            value={shop.themeTokens?.textColor || ""}
            onChange={(e) =>
              setShop({
                ...shop,
                themeTokens: { ...(shop.themeTokens || {}), textColor: e.target.value }
              })
            }
            placeholder="#111111"
          />
          <LabeledInput
            label="Primary CTA label"
            value={shop.themeTokens?.ctaLabel || ""}
            onChange={(e) =>
              setShop({
                ...shop,
                themeTokens: { ...(shop.themeTokens || {}), ctaLabel: e.target.value }
              })
            }
            placeholder="Book a service"
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setActiveModal(null)} disabled={saving}>Exit</Button>
            <Button
              disabled={saving}
              onClick={async () => {
                const ok = await saveSettings();
                if (ok) setActiveModal(null);
              }}
            >
              {saving ? "Saving..." : "Save theme"}
            </Button>
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
