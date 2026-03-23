import { describe, it, expect } from "vitest";
import { buildSlots, type AvailabilityInput } from "./slots";
import { parseLocalDateTime } from "./time";

// Rules reference: Mon–Sat (1–6) working days, 08:00–18:00 SAST (+02:00),
// 30-min slots, 10-min setup + 10-min wrap buffer, 24h advance notice,
// 1.1× travel multiplier.

function makeInput(overrides: Partial<AvailabilityInput>): AvailabilityInput {
  return {
    date: "2025-03-10", // Monday
    packageDurationMinutes: 60,
    existingBookings: [],
    now: new Date("2025-03-08T06:00:00Z"), // well before notice window
    ...overrides,
  };
}

describe("buildSlots", () => {
  it("returns slots for a working weekday", () => {
    const slots = buildSlots(makeInput({}));
    expect(slots.length).toBeGreaterThan(0);
    // All slots within work hours
    const workStart = parseLocalDateTime("2025-03-10", "08:00");
    const workEnd = parseLocalDateTime("2025-03-10", "18:00");
    for (const slot of slots) {
      expect(slot.start.getTime()).toBeGreaterThanOrEqual(workStart.getTime());
      expect(slot.end.getTime()).toBeLessThanOrEqual(workEnd.getTime());
    }
  });

  it("returns empty for Sunday (non-working day)", () => {
    // 2025-03-09 is a Sunday
    const slots = buildSlots(makeInput({ date: "2025-03-09" }));
    expect(slots).toEqual([]);
  });

  it("returns slots on Saturday (working day)", () => {
    // 2025-03-08 is a Saturday — set now well before to pass 24h notice
    const slots = buildSlots(makeInput({ date: "2025-03-08", now: new Date("2025-03-06T06:00:00Z") }));
    expect(slots.length).toBeGreaterThan(0);
  });

  it("respects the 24h advance notice window", () => {
    // now = 2025-03-10T10:00 SAST → minStart = 2025-03-11T10:00 SAST
    const now = new Date("2025-03-10T08:00:00Z"); // 10:00 SAST
    const slots = buildSlots(makeInput({ date: "2025-03-10", now }));
    // All slots on the same day should be filtered out since they're within 24h
    expect(slots).toEqual([]);
  });

  it("applies setup and wrap buffers (booked minutes > package duration)", () => {
    // 60 min package × 1.1 travel = 66 → ceil = 66, + 10 setup + 10 wrap = 86 min
    const slots = buildSlots(makeInput({ packageDurationMinutes: 60 }));
    if (slots.length > 0) {
      const first = slots[0];
      const durationMs = first.end.getTime() - first.start.getTime();
      const durationMin = durationMs / 60000;
      expect(durationMin).toBe(86);
    }
  });

  it("filters out slots that overlap with existing bookings", () => {
    const start = parseLocalDateTime("2025-03-10", "09:00");
    const end = parseLocalDateTime("2025-03-10", "11:00");
    const slotsWithBooking = buildSlots(
      makeInput({ existingBookings: [{ start, end }] })
    );
    const slotsWithout = buildSlots(makeInput({ existingBookings: [] }));

    // Should have fewer slots when there's an existing booking
    expect(slotsWithBooking.length).toBeLessThan(slotsWithout.length);
    // No slot should overlap the blocked window
    for (const slot of slotsWithBooking) {
      const overlaps = slot.start < end && slot.end > start;
      expect(overlaps).toBe(false);
    }
  });

  it("returns slots at 30-minute intervals", () => {
    const slots = buildSlots(makeInput({}));
    for (let i = 1; i < slots.length; i++) {
      const gap = slots[i].start.getTime() - slots[i - 1].start.getTime();
      expect(gap).toBe(30 * 60 * 1000);
    }
  });
});
