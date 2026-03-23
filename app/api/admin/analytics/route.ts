import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import {
  BookingsRepo,
  JobCardsRepo,
  InvoicesRepo,
  RatingsRepo,
  ProfilesRepo
} from "@/src/lib/store";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateKey(isoString: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit",
    timeZone: "Africa/Johannesburg"
  }).format(new Date(isoString));
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "month";

  const now = new Date();
  const cutoff = period === "week" ? startOfWeek(now) : startOfMonth(now);
  const cutoffIso = cutoff.toISOString();

  const [allBookings, allJobCards, allInvoices, allRatings, mechanics] = await Promise.all([
    BookingsRepo.list(auth.shopId!),
    JobCardsRepo.list(auth.shopId!),
    InvoicesRepo.list(auth.shopId!),
    RatingsRepo.list(auth.shopId!),
    ProfilesRepo.listMechanics(auth.shopId!)
  ]);

  // Filter to period
  const bookings = allBookings.filter((b) => b.createdAtIso >= cutoffIso);
  const invoices = allInvoices.filter((inv) => inv.issuedAtIso >= cutoffIso);
  const jobCards = allJobCards.filter((jc) => jc.slotIso >= cutoffIso);
  const ratings = allRatings.filter((r) => r.createdAtIso >= cutoffIso);

  // 1. Booking counts by status
  const totalBookings = bookings.length;
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
  const completed = bookings.filter((b) => b.status === "COMPLETED").length;
  const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
  const draft = bookings.filter((b) => b.status === "DRAFT").length;

  // 2. AOV (Average Order Value) from invoices
  const totalRevenueCents = invoices.reduce((sum, inv) => sum + inv.totalCents, 0);
  const aovCents = invoices.length > 0 ? Math.round(totalRevenueCents / invoices.length) : 0;

  // 3. Mechanic utilization
  // Available hours = active mechanics * business hours per day * days in period
  const activeMechanics = mechanics.filter((m) => m.status === "ACTIVE").length || 1;
  const daysSinceCutoff = Math.max(1, Math.ceil((now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24)));
  const hoursPerDay = 8;
  const totalAvailableMinutes = activeMechanics * hoursPerDay * 60 * daysSinceCutoff;
  const bookedMinutes = jobCards
    .filter((jc) => jc.status !== "CANCELLED")
    .reduce((sum, jc) => sum + jc.durationMinsSnapshot, 0);
  const utilizationPercent = totalAvailableMinutes > 0
    ? Math.round((bookedMinutes / totalAvailableMinutes) * 100)
    : 0;

  // 4. On-time % — completed jobs that were NOT rescheduled (no amendedAt on their booking)
  const completedBookings = allBookings.filter(
    (b) => b.status === "COMPLETED" && b.createdAtIso >= cutoffIso
  );
  const onTimeCount = completedBookings.filter((b) => !b.amendedAtIso).length;
  const onTimePercent = completedBookings.length > 0
    ? Math.round((onTimeCount / completedBookings.length) * 100)
    : 100;

  // 5. Average rating
  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 10) / 10
    : 0;

  // 6. Daily booking trend (last 14 days)
  const trend: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = toDateKey(d.toISOString());
    const count = allBookings.filter((b) => toDateKey(b.createdAtIso) === dateKey).length;
    trend.push({ date: dateKey, count });
  }

  // 7. Status breakdown for pie/bar
  const statusBreakdown = [
    { status: "DRAFT", count: draft },
    { status: "CONFIRMED", count: confirmed },
    { status: "COMPLETED", count: completed },
    { status: "CANCELLED", count: cancelled }
  ];

  // 8. Jobs today
  const todayKey = toDateKey(now.toISOString());
  const jobsTodayCards = allJobCards.filter((job) => toDateKey(job.slotIso) === todayKey);
  const jobsToday = {
    scheduled: jobsTodayCards.filter((job) => job.status === "SCHEDULED").length,
    inProgress: jobsTodayCards.filter((job) =>
      ["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_APPROVAL"].includes(job.status)
    ).length,
    completed: jobsTodayCards.filter((job) => job.status === "COMPLETED").length
  };

  // 9. Avg turnaround (booking createdAt -> job completedAt)
  const completedCards = allJobCards.filter((job) => job.completion?.completedAtIso);
  const turnaroundHours = completedCards
    .map((job) => {
      const booking = allBookings.find((entry) => entry.id === job.bookingId);
      if (!booking || !job.completion?.completedAtIso) return null;
      const start = new Date(booking.createdAtIso).getTime();
      const end = new Date(job.completion.completedAtIso).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
      return (end - start) / (1000 * 60 * 60);
    })
    .filter((value): value is number => typeof value === "number");
  const avgTurnaroundHours =
    turnaroundHours.length > 0
      ? Math.round((turnaroundHours.reduce((sum, value) => sum + value, 0) / turnaroundHours.length) * 10) / 10
      : 0;

  // 10. Most common services
  const serviceMap = new Map<string, number>();
  for (const booking of bookings) {
    const key = booking.serviceNameSnapshot || "Unspecified";
    serviceMap.set(key, (serviceMap.get(key) || 0) + 1);
  }
  const mostCommonServices = [...serviceMap.entries()]
    .map(([serviceName, count]) => ({ serviceName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 11. Mechanic workload counts
  const mechanicMap = new Map<string, number>();
  for (const job of jobCards) {
    if (!job.assignedMechanicId) continue;
    mechanicMap.set(job.assignedMechanicId, (mechanicMap.get(job.assignedMechanicId) || 0) + 1);
  }
  const mechanicWorkloads = mechanics
    .map((mechanic) => ({
      mechanicId: mechanic.id,
      mechanicName: mechanic.name || mechanic.phone,
      jobCount: mechanicMap.get(mechanic.id) || 0
    }))
    .sort((a, b) => b.jobCount - a.jobCount);

  return NextResponse.json({
    period,
    kpis: {
      totalBookings,
      totalRevenueCents,
      aovCents,
      utilizationPercent,
      onTimePercent,
      avgRating,
      ratingCount: ratings.length,
      activeMechanics
    },
    jobsToday,
    avgTurnaroundHours,
    mostCommonServices,
    mechanicWorkloads,
    statusBreakdown,
    trend
  });
}
