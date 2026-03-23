import type { BookingStatus, JobCardStatus } from "@/src/lib/store";

const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

const JOBCARD_TRANSITIONS: Record<JobCardStatus, JobCardStatus[]> = {
  SCHEDULED: ["EN_ROUTE", "CANCELLED"],
  EN_ROUTE: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["AWAITING_APPROVAL", "COMPLETED", "CANCELLED"],
  AWAITING_APPROVAL: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

export function canTransitionBooking(current: BookingStatus, next: BookingStatus) {
  return BOOKING_TRANSITIONS[current].includes(next);
}

export function canTransitionJobCard(current: JobCardStatus, next: JobCardStatus) {
  return JOBCARD_TRANSITIONS[current].includes(next);
}

export function assertBookingTransition(current: BookingStatus, next: BookingStatus) {
  if (current === next) {
    return {
      ok: false as const,
      message: `Booking is already ${next}.`
    };
  }
  if (!canTransitionBooking(current, next)) {
    return {
      ok: false as const,
      message: `Invalid booking transition from ${current} to ${next}.`
    };
  }
  return { ok: true as const };
}

export function assertJobCardTransition(current: JobCardStatus, next: JobCardStatus) {
  if (current === next) {
    return {
      ok: false as const,
      message: `Job card is already ${next}.`
    };
  }
  if (!canTransitionJobCard(current, next)) {
    return {
      ok: false as const,
      message: `Invalid job card transition from ${current} to ${next}.`
    };
  }
  return { ok: true as const };
}

export function isJobCardAmendLocked(status: JobCardStatus) {
  return ["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_APPROVAL", "COMPLETED", "CANCELLED"].includes(status);
}
