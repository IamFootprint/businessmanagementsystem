import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { BookingsRepo } from "@/src/lib/store";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const { searchParams } = new URL(req.url);
  const rawStatus = searchParams.get("status");
  const query = (searchParams.get("q") || "").trim().toLowerCase();
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const allowedStatuses = new Set([
    "DRAFT",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED"
  ]);
  const status = rawStatus && allowedStatuses.has(rawStatus) ? rawStatus : undefined;

  const bookings = await BookingsRepo.list(auth.shopId!);
  const filtered = bookings.filter((booking) => {
    if (status && booking.status !== status) return false;

    if (from && booking.slotIso < from) return false;
    if (to && booking.slotIso > to + "T23:59:59.999Z") return false;

    if (!query) return true;

    const haystack = [
      booking.ref,
      booking.customerName,
      booking.customerPhone,
      booking.serviceNameSnapshot
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  return NextResponse.json({ bookings: filtered });
}
