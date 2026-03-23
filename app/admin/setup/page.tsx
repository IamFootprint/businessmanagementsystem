"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminUi } from "../admin-ui";
type CheckStatus = "COMPLETE" | "NEEDS_ACTION" | "ERROR";

type SetupCheck = {
  key: string;
  title: string;
  detail: string;
  href: string;
  status: CheckStatus;
  note?: string;
};

function statusClass(status: CheckStatus) {
  if (status === "COMPLETE") return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (status === "ERROR") return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

export default function SetupPage() {
  const [checks, setChecks] = useState<SetupCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { canEdit, reason } = useAdminUi();

  async function loadSetup() {
    setLoading(true);
    setError(null);

    const request = async (url: string) => {
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data };
    };

    try {
      const [shopRes, pricingRes, catalogRes, availabilityRes, bookingsRes] = await Promise.all([
        request("/api/admin/settings/shop"),
        request("/api/admin/pricing"),
        request("/api/admin/catalog/services"),
        request("/api/admin/availability/settings"),
        request("/api/public/bookings")
      ]);

      const shopConfigured =
        shopRes.ok && Boolean(shopRes.data?.shop?.name) && Boolean(shopRes.data?.shop?.baseLocation);
      const pricingConfigured = pricingRes.ok && Boolean(pricingRes.data?.rule?.isActive);
      const activeServices =
        catalogRes.ok && Array.isArray(catalogRes.data?.services)
          ? catalogRes.data.services.filter((item: { isActive?: boolean }) => item?.isActive).length
          : 0;
      const availabilityConfigured =
        availabilityRes.ok && typeof availabilityRes.data?.businessHours === "string"
          ? availabilityRes.data.businessHours.trim().length > 0
          : false;
      const bookingCount =
        bookingsRes.ok && Array.isArray(bookingsRes.data?.bookings) ? bookingsRes.data.bookings.length : 0;

      const next: SetupCheck[] = [
        {
          key: "shop",
          title: "Update shop settings",
          detail: "Configure shop profile, contact details, and base location.",
          href: "/admin/settings",
          status: shopConfigured ? "COMPLETE" : shopRes.ok ? "NEEDS_ACTION" : "ERROR",
          note: shopConfigured
            ? "Shop profile is configured."
            : shopRes.ok
              ? "Set shop name and base location."
              : "Settings API not reachable."
        },
        {
          key: "pricing",
          title: "Configure pricing rules",
          detail: "Set call-out, platform fee, markup, and travel bands.",
          href: "/admin/pricing",
          status: pricingConfigured ? "COMPLETE" : pricingRes.ok ? "NEEDS_ACTION" : "ERROR",
          note: pricingConfigured
            ? "Active pricing rule is available."
            : pricingRes.ok
              ? "Pricing rule exists but is not active."
              : "Pricing API not reachable."
        },
        {
          key: "catalog",
          title: "Verify catalogue items",
          detail: "Ensure services are active and sorted correctly for customers.",
          href: "/admin/catalog",
          status: activeServices > 0 ? "COMPLETE" : catalogRes.ok ? "NEEDS_ACTION" : "ERROR",
          note:
            activeServices > 0
              ? `${activeServices} active services available.`
              : catalogRes.ok
                ? "No active services yet."
                : "Catalogue API not reachable."
        },
        {
          key: "availability",
          title: "Review availability and blackout dates",
          detail: "Set operating hours and blackout/emergency dates.",
          href: "/admin/availability",
          status: availabilityConfigured ? "COMPLETE" : availabilityRes.ok ? "NEEDS_ACTION" : "ERROR",
          note: availabilityConfigured
            ? "Operating hours configured."
            : availabilityRes.ok
              ? "Add operating hours before opening bookings."
              : "Availability API not reachable."
        },
        {
          key: "bookings",
          title: "Test booking flow",
          detail: "Run one booking end-to-end to confirm journeys are working.",
          href: "/admin/bookings/new",
          status: bookingsRes.ok ? (bookingCount > 0 ? "COMPLETE" : "NEEDS_ACTION") : "ERROR",
          note:
            bookingsRes.ok
              ? bookingCount > 0
                ? `${bookingCount} bookings recorded.`
                : "No bookings yet. Create a test booking."
              : "Bookings API not reachable."
        }
      ];

      setChecks(next);
    } catch {
      setError("Failed to load setup checklist.");
      setChecks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSetup();
  }, []);

  const completion = useMemo(() => {
    if (checks.length === 0) return 0;
    const complete = checks.filter((item) => item.status === "COMPLETE").length;
    return Math.round((complete / checks.length) * 100);
  }, [checks]);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h1>Setup checklist</h1>
      <p>Use this checklist to prepare the shop for bookings.</p>
      {!canEdit ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{reason || "Read-only access: setup changes are limited."}</div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex items-center gap-2 mt-3">
        <strong>Completion: {completion}%</strong>
        <Button variant="outline" onClick={() => void loadSetup()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh checklist"}
        </Button>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Checklist item</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {checks.length === 0 && !loading ? (
              <tr>
                <td colSpan={4}>Checklist unavailable. Click refresh.</td>
              </tr>
            ) : null}
            {checks.map((item) => (
              <tr key={item.key}>
                <td>
                  <strong>{item.title}</strong>
                  <div className="text-sm text-muted-foreground">{item.detail}</div>
                </td>
                <td>
                  <span className={statusClass(item.status)}>
                    {item.status === "COMPLETE"
                      ? "Complete"
                      : item.status === "NEEDS_ACTION"
                        ? "Needs action"
                        : "Error"}
                  </span>
                </td>
                <td>{item.note || "\u2014"}</td>
                <td>
                  <a
                    href={item.href}
                    className="text-primary hover:text-primary/80 transition-colors"
                    aria-label={`Open ${item.title}`}
                    title={`Open ${item.title}`}
                  >
                    <span aria-hidden="true">{"\u2197"}</span>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
