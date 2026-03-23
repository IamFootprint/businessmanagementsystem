function asDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatParts(date: Date, withTime = false) {
  const formatter = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {})
  });

  const parts = formatter.formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return {
    day: values.get("day") || "00",
    month: values.get("month") || "00",
    year: values.get("year") || "0000",
    hour: values.get("hour") || "00",
    minute: values.get("minute") || "00"
  };
}

export function formatDateZA(value: string | Date | null | undefined) {
  const date = asDate(value);
  if (!date) return "—";
  const parts = formatParts(date);
  return `${parts.day}-${parts.month}-${parts.year}`;
}

export function formatDateTimeZA(value: string | Date | null | undefined) {
  const date = asDate(value);
  if (!date) return "—";
  const parts = formatParts(date, true);
  return `${parts.day}-${parts.month}-${parts.year} ${parts.hour}:${parts.minute}`;
}
