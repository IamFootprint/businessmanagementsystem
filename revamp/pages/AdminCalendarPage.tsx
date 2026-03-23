import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceShell } from "@/revamp/components/WorkspaceShell";
import { useToast } from "@/revamp/hooks/use-toast";
import { ADMIN_NAV_GROUPS } from "@/revamp/lib/navigation";
import { StatusBadge, type BookingStatus } from "@/revamp/components/StatusBadge";
import { Button } from "@/revamp/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/revamp/lib/utils";
import { apiFetch } from "@/lib/client/api";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

type ViewMode = "day" | "week" | "month";

type BookingRow = {
  id: string;
  ref: string;
  customerName: string;
  serviceNameSnapshot: string;
  slotIso: string;
  status: string;
  preferredMechanicId?: string;
};

interface CalendarJob {
  id: string;
  bookingId: string;
  time: string;
  hour: number;
  date: Date;
  customer: string;
  service: string;
  mechanic: string;
  status: BookingStatus;
  duration: number;
  slotIso: string;
}

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8);

function dateIsoKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(date);
}

function toSlotIso(date: Date, hour: number) {
  const day = dateIsoKey(date);
  const hh = String(hour).padStart(2, "0");
  return new Date(`${day}T${hh}:00:00+02:00`).toISOString();
}

function normalizeStatus(status: string): BookingStatus {
  const normalized = status.trim().toLowerCase();
  if (
    normalized === "pending" ||
    normalized === "confirmed" ||
    normalized === "en_route" ||
    normalized === "arrived" ||
    normalized === "in_progress" ||
    normalized === "awaiting_approval" ||
    normalized === "scheduled" ||
    normalized === "draft" ||
    normalized === "completed" ||
    normalized === "cancelled" ||
    normalized === "refunded" ||
    normalized === "failed"
  ) {
    return normalized;
  }
  return "pending";
}

function toJob(booking: BookingRow): CalendarJob {
  const date = new Date(booking.slotIso);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return {
    id: booking.ref,
    bookingId: booking.id,
    time: `${hh}:${mm}`,
    hour: date.getHours(),
    date,
    customer: booking.customerName || "Customer",
    service: booking.serviceNameSnapshot || "Service",
    mechanic: booking.preferredMechanicId ? "Assigned" : "Unassigned",
    status: normalizeStatus(booking.status),
    duration: 1,
    slotIso: booking.slotIso,
  };
}

function getJobsForDay(jobs: CalendarJob[], date: Date) {
  return jobs.filter((job) => isSameDay(job.date, date));
}

function DayView({ date, jobs, onReschedule }: { date: Date; jobs: CalendarJob[]; onReschedule: (jobId: string, newHour: number) => void }) {
  const dayJobs = getJobsForDay(jobs, date);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);

  const handleDragStart = (event: React.DragEvent, jobId: string) => {
    event.dataTransfer.setData("text/plain", jobId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (event: React.DragEvent, hour: number) => {
    event.preventDefault();
    setDragOverHour(null);
    const jobId = event.dataTransfer.getData("text/plain");
    if (jobId) onReschedule(jobId, hour);
  };

  const handleDragOver = (event: React.DragEvent, hour: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverHour(hour);
  };

  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-[60px_1fr] divide-x divide-border">
        {HOURS.map((hour) => {
          const jobsAtHour = dayJobs.filter((job) => job.hour === hour);
          return (
            <div key={hour} className="contents">
              <div className="px-2 py-3 text-xs text-muted-foreground text-right font-mono border-b border-border">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div
                className={cn("min-h-[60px] border-b border-border p-1 relative transition-colors", dragOverHour === hour && "bg-primary/5 ring-1 ring-inset ring-primary/30")}
                onDrop={(event) => handleDrop(event, hour)}
                onDragOver={(event) => handleDragOver(event, hour)}
                onDragLeave={() => setDragOverHour(null)}
              >
                {jobsAtHour.map((job) => (
                  <div
                    key={job.bookingId}
                    draggable
                    onDragStart={(event) => handleDragStart(event, job.bookingId)}
                    className="rounded-lg bg-primary/8 border border-primary/20 p-2 mb-1 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    style={{ minHeight: `${job.duration * 56}px` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{job.service}</p>
                        <p className="text-xs text-muted-foreground">{job.customer} · {job.mechanic}</p>
                      </div>
                      <StatusBadge status={job.status} className="shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  weekStart,
  jobs,
  onReschedule,
}: {
  weekStart: Date;
  jobs: CalendarJob[];
  onReschedule: (jobId: string, newHour: number, newDate: Date) => void;
}) {
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleDragStart = (event: React.DragEvent, jobId: string) => {
    event.dataTransfer.setData("text/plain", jobId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (event: React.DragEvent, hour: number, date: Date) => {
    event.preventDefault();
    setDragOver(null);
    const jobId = event.dataTransfer.getData("text/plain");
    if (jobId) onReschedule(jobId, hour, date);
  };

  const cellKey = (hour: number, dayIdx: number) => `${hour}-${dayIdx}`;

  return (
    <div className="panel overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-border">
          <div className="px-2 py-2" />
          {days.map((date) => (
            <div key={date.toISOString()} className="px-2 py-2 text-center border-l border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase">{format(date, "EEE")}</p>
              <p className={cn("text-sm font-bold", isToday(date) ? "text-primary" : "text-foreground")}>{format(date, "d MMM")}</p>
            </div>
          ))}
        </div>
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-border last:border-b-0">
            <div className="px-2 py-2 text-xs text-muted-foreground text-right font-mono">
              {String(hour).padStart(2, "0")}:00
            </div>
            {days.map((date, dayIdx) => {
              const dayJobs = getJobsForDay(jobs, date).filter((job) => job.hour === hour);
              const key = cellKey(hour, dayIdx);
              return (
                <div
                  key={dayIdx}
                  className={cn("border-l border-border min-h-[48px] p-0.5 transition-colors", dragOver === key && "bg-primary/5 ring-1 ring-inset ring-primary/30")}
                  onDrop={(event) => handleDrop(event, hour, date)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDragOver(key);
                  }}
                  onDragLeave={() => setDragOver(null)}
                >
                  {dayJobs.map((job) => (
                    <div
                      key={job.bookingId}
                      draggable
                      onDragStart={(event) => handleDragStart(event, job.bookingId)}
                      className="rounded bg-primary/8 border border-primary/20 px-1.5 py-1 text-xs cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    >
                      <p className="font-semibold text-foreground truncate">{job.service}</p>
                      <p className="text-muted-foreground truncate">{job.customer}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthView({
  currentDate,
  onDayClick,
  jobs,
  onReschedule,
}: {
  currentDate: Date;
  onDayClick: (date: Date) => void;
  jobs: CalendarJob[];
  onReschedule: (jobId: string, newHour: number, newDate: Date) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });
  const weekDayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const handleDragStart = (event: React.DragEvent, jobId: string) => {
    event.dataTransfer.setData("text/plain", jobId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (event: React.DragEvent, day: Date) => {
    event.preventDefault();
    setDragOverDate(null);
    const jobId = event.dataTransfer.getData("text/plain");
    if (!jobId) return;
    const target = jobs.find((job) => job.bookingId === jobId);
    if (!target) return;
    onReschedule(jobId, target.hour, day);
  };

  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {weekDayHeaders.map((dayName) => (
          <div key={dayName} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground uppercase">
            {dayName}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {allDays.map((day) => {
          const dayJobs = getJobsForDay(jobs, day);
          const inMonth = isSameMonth(day, currentDate);
          const dayKey = dateIsoKey(day);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "border-b border-r border-border min-h-[90px] p-1.5 text-left transition-colors hover:bg-muted/50 flex flex-col cursor-pointer",
                !inMonth && "opacity-40",
                dragOverDate === dayKey && "bg-primary/5 ring-1 ring-inset ring-primary/30"
              )}
              onDrop={(event) => handleDrop(event, day)}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverDate(dayKey);
              }}
              onDragLeave={() => setDragOverDate(null)}
            >
              <span className={cn("text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full mb-0.5", isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground")}>
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                {dayJobs.slice(0, 3).map((job) => (
                  <div
                    key={job.bookingId}
                    draggable
                    onDragStart={(event) => {
                      event.stopPropagation();
                      handleDragStart(event, job.bookingId);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    className={cn(
                      "rounded px-1 py-0.5 text-[10px] font-medium truncate leading-tight cursor-grab active:cursor-grabbing",
                      job.status === "pending" ? "bg-accent/15 text-accent" : job.status === "confirmed" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {job.time} {job.service}
                  </div>
                ))}
                {dayJobs.length > 3 ? <span className="text-[10px] text-muted-foreground font-medium">+{dayJobs.length - 3} more</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminCalendarPage() {
  const [view, setView] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [jobs, setJobs] = useState<CalendarJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const movingBookingIdsRef = useRef<Set<string>>(new Set());

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  useEffect(() => {
    let ignore = false;
    async function loadJobs() {
      setLoading(true);
      setError(null);
      try {
        let fromDate = currentDate;
        let toDate = currentDate;
        if (view === "week") {
          fromDate = weekStart;
          toDate = addDays(weekStart, 6);
        } else if (view === "month") {
          const monthStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
          const monthEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
          fromDate = monthStart;
          toDate = monthEnd;
        }

        const from = dateIsoKey(fromDate);
        const to = dateIsoKey(toDate);
        const data = await apiFetch<{ bookings: BookingRow[] }>(`/api/admin/bookings?from=${from}&to=${to}`);
        if (ignore) return;
        setJobs((data.bookings || []).map(toJob));
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load calendar bookings.");
          setJobs([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadJobs();
    return () => {
      ignore = true;
    };
  }, [currentDate, weekStart, view]);

  const handleReschedule = useCallback(
    async (jobId: string, newHour: number, newDate?: Date) => {
      const target = jobs.find((job) => job.bookingId === jobId);
      if (!target) return;
      const moveDate = newDate || target.date;
      const unchangedSlot = target.hour === newHour && isSameDay(target.date, moveDate);
      if (unchangedSlot) return;
      if (movingBookingIdsRef.current.has(jobId)) return;
      movingBookingIdsRef.current.add(jobId);
      const nextIso = toSlotIso(moveDate, newHour);

      const previousJobs = jobs.slice();
      setJobs((prev) =>
        prev.map((job) =>
          job.bookingId === jobId
            ? {
                ...job,
                hour: newHour,
                time: `${String(newHour).padStart(2, "0")}:00`,
                date: new Date(nextIso),
                slotIso: nextIso,
              }
            : job
        )
      );

      try {
        await apiFetch(`/api/admin/bookings/${jobId}/reschedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotStart: nextIso,
            allowSameDayOverride: true,
            reasonText: "Calendar drag-and-drop",
          }),
        });
        const dateLabel = newDate && !isSameDay(target.date, newDate) ? ` on ${format(newDate, "EEE d MMM")}` : "";
        toast({
          title: "Booking rescheduled",
          description: `${target.service} moved to ${String(newHour).padStart(2, "0")}:00${dateLabel}`,
        });
      } catch (moveError) {
        setJobs(previousJobs);
        toast({
          title: "Reschedule failed",
          description: moveError instanceof Error ? moveError.message : "Could not reschedule this booking.",
          variant: "destructive",
        });
      } finally {
        movingBookingIdsRef.current.delete(jobId);
      }
    },
    [jobs, toast]
  );

  const dateLabel = view === "day" ? format(currentDate, "d MMM yyyy") : view === "week" ? `${format(weekStart, "d")}–${format(addDays(weekStart, 5), "d MMM yyyy")}` : format(currentDate, "MMMM yyyy");

  function navigateDate(direction: 1 | -1) {
    if (view === "day") setCurrentDate((value) => (direction === 1 ? addDays(value, 1) : subDays(value, 1)));
    else if (view === "week") setCurrentDate((value) => (direction === 1 ? addWeeks(value, 1) : subWeeks(value, 1)));
    else setCurrentDate((value) => (direction === 1 ? addMonths(value, 1) : subMonths(value, 1)));
  }

  function handleMonthDayClick(date: Date) {
    setCurrentDate(date);
    setView("day");
  }

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Calendar">
      <div className="stack-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground">Review scheduled jobs and upcoming demand.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold text-foreground min-w-[140px] text-center">{dateLabel}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize", view === mode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {mode}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">Loading calendar...</p>
          </div>
        ) : null}
        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled">{error}</p>
          </div>
        ) : null}

        {view === "day" ? <DayView date={currentDate} jobs={jobs} onReschedule={handleReschedule} /> : null}
        {view === "week" ? <WeekView weekStart={weekStart} jobs={jobs} onReschedule={handleReschedule} /> : null}
        {view === "month" ? <MonthView currentDate={currentDate} onDayClick={handleMonthDayClick} jobs={jobs} onReschedule={handleReschedule} /> : null}
      </div>
    </WorkspaceShell>
  );
}
