"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCheck, Plus, X, Save, ExternalLink } from "lucide-react";

type WidgetConfig = {
  buttonColor: string;
  buttonPosition: "bottom-right" | "bottom-left";
  buttonLabel: string;
  hideFab: boolean;
  authorizedDomains: string[];
  installedAt: string | null;
};

type ShopData = {
  slug: string;
  name: string;
  widgetConfig: WidgetConfig;
};

export default function WidgetSettingsPage() {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable fields
  const [buttonColor, setButtonColor] = useState("#1a6b5a");
  const [buttonPosition, setButtonPosition] = useState<"bottom-right" | "bottom-left">("bottom-right");
  const [buttonLabel, setButtonLabel] = useState("Book Now");
  const [newDomain, setNewDomain] = useState("");
  const [authorizedDomains, setAuthorizedDomains] = useState<string[]>([]);

  const loadShop = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/widget");
      if (!res.ok) {
        setError("Failed to load widget settings.");
        return;
      }
      const data = await res.json();
      setShop(data);
      const wc = data.widgetConfig;
      setButtonColor(wc.buttonColor || "#1a6b5a");
      setButtonPosition(wc.buttonPosition || "bottom-right");
      setButtonLabel(wc.buttonLabel || "Book Now");
      setAuthorizedDomains(wc.authorizedDomains || []);
    } catch {
      setError("Connection failed. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShop();
  }, [loadShop]);

  function handleCopy() {
    if (!shop) return;
    const snippet = getEmbedSnippet(shop.slug, buttonColor, buttonLabel);
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function addDomain() {
    const trimmed = newDomain.trim().toLowerCase();
    if (!trimmed) return;
    if (authorizedDomains.includes(trimmed)) return;
    setAuthorizedDomains([...authorizedDomains, trimmed]);
    setNewDomain("");
  }

  function removeDomain(domain: string) {
    setAuthorizedDomains(authorizedDomains.filter((d) => d !== domain));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/settings/widget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buttonColor,
          buttonPosition,
          buttonLabel,
          authorizedDomains,
        }),
      });
      if (!res.ok) {
        setError("Failed to save widget settings.");
      } else {
        setSuccessMsg("Widget settings saved.");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch {
      setError("Connection failed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Widget Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Widget Settings</h1>
          <p className="text-sm text-destructive mt-1">{error || "Failed to load."}</p>
        </div>
      </div>
    );
  }

  const embedSnippet = getEmbedSnippet(shop.slug, buttonColor, buttonLabel);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Widget Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the CycleDesk booking widget for your website.
        </p>
      </div>

      {/* Installation status */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Status</p>
            <CardTitle className="text-lg font-display">Installation</CardTitle>
          </div>
          <Badge variant={shop.widgetConfig.installedAt ? "default" : "secondary"}>
            {shop.widgetConfig.installedAt ? "Installed" : "Not installed"}
          </Badge>
        </CardHeader>
        <CardContent>
          {shop.widgetConfig.installedAt ? (
            <p className="text-sm text-muted-foreground">
              Widget was first detected on{" "}
              {new Date(shop.widgetConfig.installedAt).toLocaleDateString("en-ZA", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              .
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              The widget has not been detected on any website yet. Add the embed code below to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Embed code */}
      <Card>
        <CardHeader className="pb-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Integration</p>
          <CardTitle className="text-lg font-display">Embed code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Add this code to the <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;head&gt;</code> section of your website.
          </p>
          <div className="relative">
            <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto font-mono text-foreground/80 whitespace-pre-wrap">
              {embedSnippet}
            </pre>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleCopy}
              title="Copy embed code"
            >
              {copied ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            You can also trigger the widget from any button by adding{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">data-cycledesk=&quot;book&quot;</code> to any HTML element.
          </p>
        </CardContent>
      </Card>

      {/* Customization */}
      <Card>
        <CardHeader className="pb-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Appearance</p>
          <CardTitle className="text-lg font-display">Widget customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buttonColor">Button color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="buttonColorPicker"
                  value={buttonColor}
                  onChange={(e) => setButtonColor(e.target.value)}
                  className="h-9 w-9 rounded border border-border cursor-pointer"
                />
                <Input
                  id="buttonColor"
                  value={buttonColor}
                  onChange={(e) => setButtonColor(e.target.value)}
                  placeholder="#1a6b5a"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buttonPosition">Position</Label>
              <select
                id="buttonPosition"
                value={buttonPosition}
                onChange={(e) => setButtonPosition(e.target.value as "bottom-right" | "bottom-left")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buttonLabel">Button label</Label>
              <Input
                id="buttonLabel"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                placeholder="Book Now"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Preview</p>
            <div className="flex justify-end">
              <div
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-lg"
                style={{ backgroundColor: buttonColor }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
                </svg>
                {buttonLabel || "Book Now"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authorized domains */}
      <Card>
        <CardHeader className="pb-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Security</p>
          <CardTitle className="text-lg font-display">Authorized domains</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            List the domains where the widget is allowed to load. Leave empty to allow all domains.
          </p>
          <div className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDomain(); } }}
            />
            <Button variant="outline" onClick={addDomain} disabled={!newDomain.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          {authorizedDomains.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {authorizedDomains.map((domain) => (
                <Badge key={domain} variant="secondary" className="flex items-center gap-1 pr-1">
                  <ExternalLink className="h-3 w-3" />
                  {domain}
                  <button
                    onClick={() => removeDomain(domain)}
                    className="ml-1 p-0.5 rounded hover:bg-muted"
                    title="Remove domain"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No domain restrictions. Widget will load on any website.</p>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save changes"}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
        {successMsg && <span className="text-sm text-green-600">{successMsg}</span>}
      </div>
    </div>
  );
}

function getEmbedSnippet(slug: string, color: string, label: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "https://cycledesk.co.za");
  return `<script async src="${appUrl}/widget/cycledesk-widget.js"
        data-shop="${slug}"
        data-color="${color}"
        data-label="${label}"></script>`;
}
