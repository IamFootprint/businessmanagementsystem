export type AvailabilityConfig = {
  slotMinutes: number;
  setupBufferMinutes: number;
  wrapBufferMinutes: number;
  noticeHours: number;
};

export const DEFAULT_AVAILABILITY_CONFIG: AvailabilityConfig = {
  slotMinutes: 30,
  setupBufferMinutes: 10,
  wrapBufferMinutes: 10,
  noticeHours: 24
};

export const DEFAULT_AVAILABILITY_RULES = {
  timeZone: "Africa/Johannesburg" as const,
  tzOffsetMinutes: 120,
  workingDays: [1, 2, 3, 4, 5, 6],
  workingHours: { start: "08:00", end: "18:00" },
  ...DEFAULT_AVAILABILITY_CONFIG,
  travelMultiplier: 1.1
};

export function buildAvailabilityRules(config?: Partial<AvailabilityConfig>) {
  return {
    ...DEFAULT_AVAILABILITY_RULES,
    ...config
  };
}

export const AVAILABILITY_RULES = DEFAULT_AVAILABILITY_RULES;

export function computeBookedMinutes(durationMinutes: number) {
  const travelAdjusted = Math.ceil(durationMinutes * AVAILABILITY_RULES.travelMultiplier);
  return travelAdjusted + AVAILABILITY_RULES.setupBufferMinutes + AVAILABILITY_RULES.wrapBufferMinutes;
}
