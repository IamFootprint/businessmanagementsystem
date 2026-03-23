import { AVAILABILITY_RULES, computeBookedMinutes } from "./rules";
import { addMinutes, isWorkingDay, parseLocalDateTime } from "./time";

export type BookingWindow = {
  start: Date;
  end: Date;
};

export type AvailabilitySlot = {
  start: Date;
  end: Date;
};

export type AvailabilityInput = {
  date: string;
  packageDurationMinutes: number;
  existingBookings: BookingWindow[];
  now?: Date;
};

function overlaps(a: BookingWindow, b: BookingWindow) {
  return a.start < b.end && a.end > b.start;
}

export function buildSlots({ date, packageDurationMinutes, existingBookings, now }: AvailabilityInput) {
  if (!isWorkingDay(date)) return [];

  const workStart = parseLocalDateTime(date, AVAILABILITY_RULES.workingHours.start);
  const workEnd = parseLocalDateTime(date, AVAILABILITY_RULES.workingHours.end);
  const bookedMinutes = computeBookedMinutes(packageDurationMinutes);
  const minStart = addMinutes(now ?? new Date(), AVAILABILITY_RULES.noticeHours * 60);

  const slots: AvailabilitySlot[] = [];

  for (let cursor = workStart; cursor <= workEnd; cursor = addMinutes(cursor, AVAILABILITY_RULES.slotMinutes)) {
    const slotStart = cursor;
    const slotEnd = addMinutes(slotStart, bookedMinutes);

    if (slotEnd > workEnd) {
      continue;
    }

    if (slotStart < minStart) {
      continue;
    }

    const candidate: BookingWindow = { start: slotStart, end: slotEnd };
    const hasOverlap = existingBookings.some((booking) => overlaps(candidate, booking));
    if (hasOverlap) {
      continue;
    }

    slots.push({ start: slotStart, end: slotEnd });
  }

  return slots;
}

export function resolveBookingWindow(date: string, start: Date, packageDurationMinutes: number) {
  const bookedMinutes = computeBookedMinutes(packageDurationMinutes);
  const end = addMinutes(start, bookedMinutes);
  return { start, end };
}
