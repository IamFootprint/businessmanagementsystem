import { useEffect, useMemo, useState } from "react";
import { CustomerShell } from "@/revamp/components/CustomerShell";
import { FileText, Download, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/revamp/components/ui/button";
import { cn } from "@/revamp/lib/utils";
import { apiFetch } from "@/lib/client/api";
import { formatDateTimeLongZA, formatZarFromCents } from "@/revamp/lib/formatters";

type Booking = {
  id: string;
  ref: string;
  serviceNameSnapshot: string;
  slotIso: string;
  status: string;
  pricingSnapshot?: {
    totalCents?: number;
  };
};

type InvoiceLineItem = {
  code: string;
  label: string;
  amountCents: number;
};

type InvoicePayload = {
  id: string;
  bookingId: string;
  bookingRef: string;
  customerName?: string;
  serviceName: string;
  issuedAtIso: string;
  lineItems: InvoiceLineItem[];
  totalCents: number;
  currency: string;
  status: "paid" | "pending";
};

type InvoiceView = {
  id: string;
  bookingId: string;
  bookingRef: string;
  serviceName: string;
  dateLabel: string;
  amountCents?: number;
  status: "paid" | "pending";
};

function invoiceId(bookingRef: string, index: number) {
  return `INV-${bookingRef.replace(/[^\w]/g, "").slice(-8)}-${String(index + 1).padStart(2, "0")}`;
}

function buildInvoiceText(invoice: InvoicePayload) {
  const lines = [
    `Invoice: ${invoice.id}`,
    `Booking Ref: ${invoice.bookingRef}`,
    `Issued: ${formatDateTimeLongZA(invoice.issuedAtIso)}`,
    `Status: ${invoice.status.toUpperCase()}`,
    "",
    "Line Items",
    ...invoice.lineItems.map((line) => `- ${line.label}: ${formatZarFromCents(line.amountCents)}`),
    "",
    `Total: ${formatZarFromCents(invoice.totalCents)}`,
    `Currency: ${invoice.currency}`,
  ];
  return lines.join("\n");
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function CustomerInvoices() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [downloadingBookingId, setDownloadingBookingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ bookings: Booking[] }>("/api/public/bookings");
        if (!ignore) setBookings(data.bookings || []);
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load invoices.");
          setBookings([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const invoices = useMemo<InvoiceView[]>(() => {
    return bookings
      .slice()
      .sort((a, b) => b.slotIso.localeCompare(a.slotIso))
      .map((booking, index) => ({
        id: invoiceId(booking.ref, index),
        bookingId: booking.id,
        bookingRef: booking.ref,
        serviceName: booking.serviceNameSnapshot,
        dateLabel: formatDateTimeLongZA(booking.slotIso),
        amountCents: booking.pricingSnapshot?.totalCents,
        status: booking.status === "COMPLETED" ? "paid" : "pending",
      }));
  }, [bookings]);

  async function payNow(invoice: InvoiceView) {
    setActionError(null);
    setPayingBookingId(invoice.bookingId);
    try {
      const data = await apiFetch<{ checkout: { checkoutUrl?: string } }>(
        `/api/public/bookings/${invoice.bookingId}/payments/deposit/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "PAYFAST" }),
        }
      );
      const checkoutUrl = data.checkout?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error("No checkout link was returned for this booking.");
      }
      window.location.assign(checkoutUrl);
    } catch (payError) {
      setActionError(payError instanceof Error ? payError.message : "Unable to start payment.");
    } finally {
      setPayingBookingId(null);
    }
  }

  async function download(invoice: InvoiceView) {
    setActionError(null);
    setDownloadingBookingId(invoice.bookingId);
    try {
      const data = await apiFetch<{ invoice: InvoicePayload }>(`/api/public/bookings/${invoice.bookingId}/invoice`);
      const payload = data.invoice;
      if (!payload) {
        throw new Error("Invoice not available for this booking.");
      }
      downloadTextFile(`${payload.id}.txt`, buildInvoiceText(payload));
    } catch (downloadError) {
      setActionError(downloadError instanceof Error ? downloadError.message : "Unable to download invoice.");
    } finally {
      setDownloadingBookingId(null);
    }
  }

  return (
    <CustomerShell title="Invoices">
      <div className="stack-sm">
        {loading ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">Loading invoices...</p>
          </div>
        ) : null}
        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled">{error}</p>
          </div>
        ) : null}
        {actionError ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled">{actionError}</p>
          </div>
        ) : null}
        {!loading && !error && invoices.length === 0 ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">No invoices available yet.</p>
          </div>
        ) : null}
        {!loading && !error && invoices.map((invoice) => (
          <div key={invoice.id} className="panel-padded">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{invoice.serviceName}</p>
                  <p className="text-xs text-muted-foreground">{invoice.id} · {invoice.dateLabel}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground">{formatZarFromCents(invoice.amountCents)}</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-semibold uppercase",
                    invoice.status === "paid" ? "text-status-completed" : "text-status-pending"
                  )}
                >
                  {invoice.status === "paid" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {invoice.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {invoice.status === "pending" ? (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => void payNow(invoice)}
                  disabled={payingBookingId === invoice.bookingId || downloadingBookingId === invoice.bookingId}
                >
                  {payingBookingId === invoice.bookingId ? "Opening checkout..." : "Pay Now"}
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className={invoice.status === "pending" ? "" : "flex-1"}
                onClick={() => void download(invoice)}
                disabled={downloadingBookingId === invoice.bookingId || payingBookingId === invoice.bookingId}
              >
                <Download className="w-3.5 h-3.5" />
                {downloadingBookingId === invoice.bookingId ? "Preparing..." : "Download"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </CustomerShell>
  );
}
