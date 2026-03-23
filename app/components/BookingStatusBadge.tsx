import { StatusBadge, type BookingStatus } from "@/app/components/StatusBadge";

type BookingStatusBadgeProps = {
  status?: string | null;
};

function normalizeStatus(status: string): BookingStatus {
  return status.toLowerCase().replace(/ /g, "_") as BookingStatus;
}

export default function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const normalized = normalizeStatus(status || "pending");
  return <StatusBadge status={normalized} />;
}
