import { AVAILABILITY_RULES } from "./rules";

export function parseLocalDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+02:00`);
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function getLocalWeekday(date: string) {
  const noonLocal = new Date(`${date}T12:00:00+02:00`);
  return noonLocal.getUTCDay();
}

export function isWorkingDay(date: string) {
  return AVAILABILITY_RULES.workingDays.includes(getLocalWeekday(date));
}

export function getUtcRangeForDate(date: string) {
  const start = parseLocalDateTime(date, "00:00");
  const end = parseLocalDateTime(date, "23:59");
  return { start, end };
}

export function formatLocalTimeLabel(date: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: AVAILABILITY_RULES.timeZone
  }).format(date);
}

export function formatLocalDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    timeZone: AVAILABILITY_RULES.timeZone
  }).format(date);
}

export function formatLocalDateIso(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: AVAILABILITY_RULES.timeZone
  }).format(date);
}
