"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import BookingStatusBadge from "@/app/components/BookingStatusBadge";
import IconAction from "@/app/components/IconAction";
import { formatDateTimeZA } from "@/lib/format/date";
import { Eye } from "lucide-react";
type Booking = {
  id: string;
  ref: string;
  customerName: string;
  customerPhone: string;
  serviceNameSnapshot: string;
  slotIso: string;
  status: string;
};

const PAGE_SIZE = 25;
const STATUSES = ["", "DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"];
const inputClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (status: string, q: string, from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();
      const res = await fetch(`/api/admin/bookings${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        setError("Failed to load bookings.");
        return;
      }
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch {
      setError("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(statusFilter, searchQuery, dateFrom, dateTo);
  }, [statusFilter, dateFrom, dateTo, load]);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setPage(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(statusFilter, value, dateFrom, dateTo);
    }, 300);
  }

  const totalPages = Math.max(1, Math.ceil(bookings.length / PAGE_SIZE));
  const paged = bookings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Operations</p>
            <h1 className="font-display font-bold text-foreground text-lg">Bookings</h1>
            <p className="text-sm text-muted-foreground">Manage booking intake, amendments, and job flow.</p>
          </div>
          <a href="/admin/bookings/new">
            <Button>New booking</Button>
          </a>
        </div>

        <div className="form-grid">
          <div className="form-grid-full sm:col-span-1">
            <input
              type="text"
              className={inputClass}
              placeholder="Search name, phone, ref..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div>
            <select className={inputClass} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
              <option value="">All statuses</option>
              {STATUSES.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              type="date"
              className={inputClass}
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              title="From date"
            />
          </div>
          <div>
            <input
              type="date"
              className={inputClass}
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              title="To date"
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <div className="flex flex-col gap-3 mt-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-full rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : paged.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">No bookings match your filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Ref</th>
                    <th className="pb-2 font-medium text-muted-foreground">Customer</th>
                    <th className="pb-2 font-medium text-muted-foreground">Service</th>
                    <th className="pb-2 font-medium text-muted-foreground">Slot</th>
                    <th className="pb-2 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((booking) => (
                    <tr key={booking.id} className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 text-foreground">{booking.ref}</td>
                      <td className="py-2.5">
                        <span className="text-foreground">{booking.customerName}</span>
                        <span className="block text-xs text-muted-foreground">{booking.customerPhone}</span>
                      </td>
                      <td className="py-2.5 text-foreground">{booking.serviceNameSnapshot}</td>
                      <td className="py-2.5 text-muted-foreground">{formatDateTimeZA(booking.slotIso)}</td>
                      <td className="py-2.5">
                        <BookingStatusBadge status={booking.status} />
                      </td>
                      <td className="py-2.5">
                        <IconAction
                          icon={Eye}
                          label={`View booking ${booking.ref}`}
                          variant="outline"
                          size="sm"
                          onClick={() => { window.location.href = `/admin/bookings/${booking.id}`; }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 ? (
              <div className="flex items-center justify-center gap-4 mt-4">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
