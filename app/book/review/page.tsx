"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getApiBaseUrl } from "@/lib/api";
import PublicHeroBanner from "@/app/components/PublicHeroBanner";
import Stepper from "../components/Stepper";
import ErrorState from "@/app/components/ErrorState";
import { useNotify } from "@/app/components/ToastProvider";
import { apiFetch, getErrorHint, isApiClientError } from "@/lib/client/api";
import { safeGetItem, safeRemoveItem } from "@/lib/safeStorage";
type Draft = {
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
  slotStart?: string;
  slotEnd?: string;
  slotLabel?: string;
};

type QuoteLineItem = {
  code: string;
  label: string;
  amountCents: number;
};

type QuoteResponse = {
  lineItems: QuoteLineItem[];
  subtotalCents: number;
  totalCents: number;
  currency: "ZAR";
};

export default function BookReviewPage() {
  const router = useRouter();
  const notify = useNotify();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteErrorHint, setQuoteErrorHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    const raw = safeGetItem("bookingDraft");
    if (raw) {
      setDraft(JSON.parse(raw));
    }
  }, []);

  async function loadQuote(activeDraft: Draft) {
    setQuoteLoading(true);
    setQuoteError(null);
    setQuoteErrorHint(null);
    try {
      const data = await apiFetch<QuoteResponse>(`${getApiBaseUrl()}/api/public/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: activeDraft.itemType,
          itemId: activeDraft.itemId,
          distanceKm: activeDraft.distanceKm,
          addOnsCents: activeDraft.addOnsCents,
          consumablesCents: activeDraft.consumablesCents,
          partsCents: activeDraft.partsCents,
          afterHours: activeDraft.afterHours
        })
      });
      setQuote(data);
    } catch (error) {
      setQuoteError("We couldn’t load pricing for this booking.");
      setQuoteErrorHint(getErrorHint(error, "Check your connection or try again.") || null);
    } finally {
      setQuoteLoading(false);
    }
  }

  useEffect(() => {
    if (draft) {
      loadQuote(draft);
    }
  }, [draft]);

  async function onConfirm() {
    if (!draft || !draft.slotStart || !quote) return;
    setLoading(true);
    setError(null);
    setErrorHint(null);
    try {
      const data = await apiFetch<{ referenceCode: string }>(`${getApiBaseUrl()}/api/public/bookings`, {
        method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: draft.customerName,
            customerPhone: draft.customerPhone,
            customerBikeId: draft.customerBikeId,
            preferredMechanicId: draft.preferredMechanicId,
            addressText: draft.addressText,
            notes: draft.notes,
            itemType: draft.itemType,
            itemId: draft.itemId,
            slotStart: draft.slotStart,
            pricingSnapshot: quote
          })
      });
      safeRemoveItem("bookingDraft");
      notify.success("Booking confirmed", `Reference ${data.referenceCode} has been created.`);
      router.push(`/success?ref=${data.referenceCode}`);
    } catch (error) {
      setError("We couldn’t confirm your booking.");
      setErrorHint(getErrorHint(error, "Try again without leaving this page.") || null);
      notify.error(
        "Booking failed",
        error instanceof Error ? error.message : "Please try again.",
        getErrorHint(error, "Review the details and retry."),
        isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
      );
    } finally {
      setLoading(false);
    }
  }

  if (!draft) {
    return (
      <Container>
        <PublicHeroBanner

          eyebrow="Online Booking"
          title="Review your booking"
          description="Confirm your service details before submission."
        />
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-foreground text-lg mb-2">Missing booking details</h2>
          <p className="text-sm text-muted-foreground mb-3">Please restart your booking.</p>
          <a href="/book/start">
            <Button>Back to booking start</Button>
          </a>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <PublicHeroBanner
        eyebrow="Online Booking"
        title="Review and confirm"
        description="Check your details and pricing breakdown before confirming."
      />
      <Stepper
        current={3}
        steps={["Select service", "Your details", "Choose slot", "Review", "Confirmation"]}
      />
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-foreground text-lg mb-1">Review your booking</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Please confirm your details and pricing below. No payment is required now. We will
          contact you to finalize the booking.
        </p>

        <div className="space-y-2 text-sm mb-6">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service</span>
            <span className="font-medium text-foreground">{draft.itemName}</span>
          </div>
          {draft.slotLabel ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slot</span>
              <span className="font-medium text-foreground">{draft.slotLabel}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium text-foreground">{draft.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-medium text-foreground">{draft.customerPhone}</span>
          </div>
          {draft.customerBikeLabel ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bike</span>
              <span className="font-medium text-foreground">{draft.customerBikeLabel}</span>
            </div>
          ) : null}
          {draft.preferredMechanicName ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preferred mechanic</span>
              <span className="font-medium text-foreground">{draft.preferredMechanicName}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Address</span>
            <span className="font-medium text-foreground">{draft.addressText}</span>
          </div>
          {draft.notes ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Notes</span>
              <span className="font-medium text-foreground">{draft.notes}</span>
            </div>
          ) : null}
          {draft.distanceKm ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance</span>
              <span className="font-medium text-foreground">{draft.distanceKm} km</span>
            </div>
          ) : null}
          {draft.addOnsCents ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Add-ons</span>
              <span className="font-medium text-foreground">{Math.round(draft.addOnsCents / 100)} ZAR</span>
            </div>
          ) : null}
          {draft.consumablesCents ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consumables</span>
              <span className="font-medium text-foreground">{Math.round(draft.consumablesCents / 100)} ZAR</span>
            </div>
          ) : null}
          {draft.partsCents ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parts</span>
              <span className="font-medium text-foreground">{Math.round(draft.partsCents / 100)} ZAR</span>
            </div>
          ) : null}
          {draft.afterHours ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">After-hours</span>
              <span className="font-medium text-foreground">Yes</span>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-border p-4">
          <h3 className="font-semibold text-foreground text-sm">Quote breakdown</h3>
          <p className="text-xs text-muted-foreground mt-1">
            This is an estimate based on the information provided. Final pricing may adjust if
            parts or travel change, but we will confirm before work begins.
          </p>
          {quoteLoading ? (
            <div className="flex flex-col gap-2 mt-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-5 w-full rounded-md bg-muted animate-pulse" />
              ))}
              <div className="h-6 w-1/2 rounded-md bg-muted animate-pulse" />
            </div>
          ) : null}
          {quoteError ? (
            <ErrorState
              title="Pricing unavailable"
              message={quoteError}
              hint={quoteErrorHint || undefined}
              onRetry={() => { if (draft) loadQuote(draft); }}
            />
          ) : null}
          {quote && !quoteLoading ? (
            <div className="mt-3 space-y-1.5 text-sm">
              {quote.lineItems.map((item) => (
                <div key={item.code} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground">{Math.round(item.amountCents / 100)} ZAR</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-2 mt-2">
                <strong className="text-foreground">Total</strong>
                <strong className="text-foreground">{Math.round(quote.totalCents / 100)} ZAR</strong>
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mt-4">
            <ErrorState title="Booking could not be completed" message={error} hint={errorHint || undefined} onRetry={onConfirm} busy={loading} retryLabel="Try again" />
          </div>
        ) : null}
        {quoteError ? (
          <p className="text-sm text-destructive mt-3">Please fix pricing errors before confirming.</p>
        ) : null}
        <div className="mt-4">
          <Button
            disabled={loading || !draft.slotStart || !quote || Boolean(quoteError)}
            onClick={onConfirm}
          >
            {loading ? "Confirming..." : "Confirm booking"}
          </Button>
        </div>
      </div>
    </Container>
  );
}
