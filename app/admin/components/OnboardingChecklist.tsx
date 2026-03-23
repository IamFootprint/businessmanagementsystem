"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Circle, Copy, CheckCheck, X } from "lucide-react";

type ChecklistItemDef = {
  key: string;
  label: string;
  href: string | null;
};

const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  { key: "shop_created", label: "Shop created", href: null },
  { key: "widget_installed", label: "Booking widget installed", href: "/admin/settings/widget" },
  { key: "catalog_customized", label: "Catalogue customized", href: "/admin/catalog" },
  { key: "hours_customized", label: "Working hours customized", href: "/admin/settings" },
  { key: "branding_added", label: "Branding added", href: "/admin/settings" },
  { key: "mechanic_added", label: "Mechanic added", href: "/admin/mechanics" },
  { key: "first_booking", label: "First booking received", href: null },
];

type OnboardingChecklistProps = {
  completedItems: string[];
  shopSlug: string;
  hasCatalogEdits: boolean;
  hasCustomHours: boolean;
  hasLogo: boolean;
  hasMechanic: boolean;
  hasBooking: boolean;
  widgetInstalled: boolean;
};

export default function OnboardingChecklist({
  completedItems,
  shopSlug,
  hasCatalogEdits,
  hasCustomHours,
  hasLogo,
  hasMechanic,
  hasBooking,
  widgetInstalled,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compute effective completed set from both saved items and live boolean flags
  const effectiveCompleted = new Set(completedItems);
  effectiveCompleted.add("shop_created"); // always complete
  if (widgetInstalled) effectiveCompleted.add("widget_installed");
  if (hasCatalogEdits) effectiveCompleted.add("catalog_customized");
  if (hasCustomHours) effectiveCompleted.add("hours_customized");
  if (hasLogo) effectiveCompleted.add("branding_added");
  if (hasMechanic) effectiveCompleted.add("mechanic_added");
  if (hasBooking) effectiveCompleted.add("first_booking");

  const total = CHECKLIST_ITEMS.length;
  const doneCount = CHECKLIST_ITEMS.filter((item) => effectiveCompleted.has(item.key)).length;
  const progressPercent = Math.round((doneCount / total) * 100);

  // Return null when all items are complete or dismissed
  if (doneCount >= total || dismissed) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "https://cycledesk.co.za");
  const embedSnippet = `<script async src="${appUrl}/widget/cycledesk-widget.js"
        data-shop="${shopSlug}"
        data-color="#1a6b5a"
        data-label="Book a Service"></script>`;

  function handleCopy() {
    navigator.clipboard.writeText(embedSnippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleDismiss() {
    setDismissed(true);
    try {
      await fetch("/api/admin/onboarding/dismiss", { method: "POST" });
    } catch {
      // best-effort
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Getting started</p>
          <CardTitle className="text-lg font-display">Onboarding checklist</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{progressPercent}%</Badge>
          <Button variant="ghost" size="sm" onClick={handleDismiss} title="Dismiss checklist">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progressPercent} className="h-2" />

        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const done = effectiveCompleted.has(item.key);
            const inner = (
              <div
                className={`flex items-center gap-3 p-3 rounded-lg border border-border transition-colors ${
                  done ? "bg-muted/30" : "hover:bg-muted/50"
                }`}
              >
                {done ? (
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={`text-sm font-medium flex-1 ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {item.label}
                </span>
                {!done && item.href && (
                  <span className="text-xs text-primary">Set up</span>
                )}
              </div>
            );

            if (!done && item.href) {
              return (
                <Link key={item.key} href={item.href}>
                  {inner}
                </Link>
              );
            }
            return <div key={item.key}>{inner}</div>;
          })}
        </div>

        {/* Embed code snippet when widget is not installed */}
        {!effectiveCompleted.has("widget_installed") && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium text-foreground">Add this snippet to your website:</p>
            <div className="relative">
              <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto font-mono text-foreground/80">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
