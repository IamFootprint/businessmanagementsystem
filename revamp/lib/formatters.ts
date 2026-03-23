const DATE_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Africa/Johannesburg",
});

const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat("en-ZA", {
  day: "2-digit",
  month: "short",
  timeZone: "Africa/Johannesburg",
});

const DAY_MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-ZA", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Johannesburg",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-ZA", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Africa/Johannesburg",
});

export function formatZarFromCents(cents?: number | null, fallback = "—") {
  if (cents === undefined || cents === null || Number.isNaN(cents)) return fallback;
  return `R ${Math.max(0, Number(cents) / 100).toLocaleString("en-ZA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatDurationMinutes(minutes?: number | null) {
  if (!minutes || minutes <= 0 || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours}h`;
  return `${hours.toFixed(1)}h`;
}

export function formatDateLabelZA(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const key = DATE_KEY_FORMATTER.format(date);
  const todayKey = DATE_KEY_FORMATTER.format(today);
  const tomorrowKey = DATE_KEY_FORMATTER.format(tomorrow);

  if (key === todayKey) return "Today";
  if (key === tomorrowKey) return "Tomorrow";
  return DAY_MONTH_FORMATTER.format(date);
}

export function formatTimeZA(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return TIME_FORMATTER.format(date);
}

export function formatDateTimeCompactZA(iso: string) {
  return `${formatDateLabelZA(iso)} · ${formatTimeZA(iso)}`;
}

export function formatDateTimeLongZA(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${DAY_MONTH_YEAR_FORMATTER.format(date)} · ${TIME_FORMATTER.format(date)}`;
}

export function formatBikeType(type?: string) {
  if (!type) return "Bike";
  if (type === "MTB") return "Mountain Bike";
  if (type === "ROAD") return "Road Bike";
  if (type === "GRAVEL") return "Gravel Bike";
  if (type === "E_BIKE") return "E-Bike";
  return "Bike";
}

export function formatBikeLabel(bike: {
  brand?: string | null;
  model?: string | null;
  bikeType?: string | null;
  eBike?: boolean | null;
}) {
  const name = [bike.brand || "", bike.model || ""].filter(Boolean).join(" ").trim();
  const type = formatBikeType(bike.bikeType || undefined);
  const label = name || type;
  return bike.eBike ? `${label} (E-Bike)` : label;
}
