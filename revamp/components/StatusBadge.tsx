import { cn } from "@/revamp/lib/utils";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "awaiting_approval"
  | "scheduled"
  | "draft"
  | "completed"
  | "cancelled"
  | "refunded"
  | "failed";

const statusConfig: Record<BookingStatus, { label: string; className: string; dot?: boolean }> = {
  pending: { label: "Pending", className: "bg-status-pending/15 text-status-pending", dot: true },
  confirmed: { label: "Confirmed", className: "bg-status-confirmed/15 text-status-confirmed" },
  en_route: { label: "En Route", className: "bg-status-enroute/15 text-status-enroute", dot: true },
  arrived: { label: "Arrived", className: "bg-status-arrived/15 text-status-arrived" },
  in_progress: { label: "In Progress", className: "bg-status-progress/15 text-status-progress", dot: true },
  awaiting_approval: { label: "Awaiting Approval", className: "bg-status-pending/15 text-status-pending", dot: true },
  scheduled: { label: "Scheduled", className: "bg-status-confirmed/15 text-status-confirmed" },
  draft: { label: "Draft", className: "bg-status-pending/15 text-status-pending" },
  completed: { label: "Completed", className: "bg-status-completed/15 text-status-completed" },
  cancelled: { label: "Cancelled", className: "bg-status-cancelled/15 text-status-cancelled" },
  refunded: { label: "Refunded", className: "bg-status-refunded/15 text-status-refunded" },
  failed: { label: "Failed", className: "bg-status-failed/15 text-status-failed" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

function normalizeStatus(status: string): BookingStatus {
  const normalized = status.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized in statusConfig) {
    return normalized as BookingStatus;
  }
  if (normalized === "awaitingapproval") return "awaiting_approval";
  return "pending";
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[normalizeStatus(status)];
  return (
    <span className={cn("status-badge", config.className, className)}>
      {config.dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" />
      )}
      {config.label}
    </span>
  );
}
