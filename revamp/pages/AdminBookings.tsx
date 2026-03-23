import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkspaceShell } from "@/revamp/components/WorkspaceShell";
import { ADMIN_NAV_GROUPS } from "@/revamp/lib/navigation";
import { StatusBadge } from "@/revamp/components/StatusBadge";
import { Button } from "@/revamp/components/ui/button";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/revamp/components/ui/input";
import { apiFetch } from "@/lib/client/api";
import { formatDateTimeLongZA, formatZarFromCents } from "@/revamp/lib/formatters";

type BookingListItem = {
  id: string;
  ref: string;
  customerName: string;
  customerPhone: string;
  serviceNameSnapshot: string;
  slotIso: string;
  status: string;
  preferredMechanicId?: string;
  pricingSnapshot?: {
    totalCents?: number;
  };
};

const STATUSES = ["", "DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

export default function AdminBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function loadBookings(filters: {
    status: string;
    query: string;
    from: string;
    to: string;
  }) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.query.trim()) params.set("q", filters.query.trim());
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      const qs = params.toString();
      const data = await apiFetch<{ bookings: BookingListItem[] }>(`/api/admin/bookings${qs ? `?${qs}` : ""}`);
      setBookings((data.bookings || []).slice());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBookings({
        status: statusFilter,
        query: searchQuery,
        from: dateFrom,
        to: dateTo,
      });
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [statusFilter, searchQuery, dateFrom, dateTo]);

  const sortedBookings = useMemo(() => {
    return bookings
      .slice()
      .sort((a, b) => a.slotIso.localeCompare(b.slotIso));
  }, [bookings]);

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Bookings">
      <div className="stack-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Bookings</h1>
            <p className="text-sm text-muted-foreground">Manage booking intake, amendments, and job flow.</p>
          </div>
          <Button size="sm" onClick={() => navigate("/admin/bookings/new")}>
            <Plus className="w-4 h-4" /> New Booking
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search bookings..."
              className="pl-9"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.filter(Boolean).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>

        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled mb-2">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadBookings({ status: statusFilter, query: searchQuery, from: dateFrom, to: dateTo })}
            >
              Retry
            </Button>
          </div>
        ) : null}

        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ref</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Service</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Mechanic</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-sm text-muted-foreground">Loading bookings...</td>
                </tr>
              ) : null}
              {!loading && sortedBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-sm text-muted-foreground">No bookings match these filters.</td>
                </tr>
              ) : null}
              {!loading && sortedBookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{booking.ref}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{booking.customerName}</p>
                    <p className="text-xs text-muted-foreground">{booking.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-foreground hidden md:table-cell">{booking.serviceNameSnapshot}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{formatDateTimeLongZA(booking.slotIso)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {booking.preferredMechanicId ? "Assigned" : "Unassigned"}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{formatZarFromCents(booking.pricingSnapshot?.totalCents)}</td>
                  <td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WorkspaceShell>
  );
}
