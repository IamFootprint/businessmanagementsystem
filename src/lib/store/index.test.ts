import { describe, it, expect } from "vitest";
import { toDateIso } from "./index";

describe("store index – toDateIso", () => {
  it("formats a date in Africa/Johannesburg timezone", () => {
    expect(toDateIso("2025-01-15T00:00:00.000Z")).toBe("2025-01-15");
  });

  it("handles SAST offset (UTC+2) crossing midnight", () => {
    // 22:30 UTC on Jan 14 → 00:30 SAST on Jan 15
    expect(toDateIso("2025-01-14T22:30:00.000Z")).toBe("2025-01-15");
  });

  it("handles summer date", () => {
    expect(toDateIso("2025-06-15T12:00:00.000Z")).toBe("2025-06-15");
  });
});

describe("store index – repo delegation", () => {
  it("exports all expected repo facades", async () => {
    const storeIndex = await import("./index");
    expect(storeIndex.ProfilesRepo).toBeDefined();
    expect(storeIndex.SessionsRepo).toBeDefined();
    expect(storeIndex.BookingsRepo).toBeDefined();
    expect(storeIndex.JobCardsRepo).toBeDefined();
    expect(storeIndex.InvoicesRepo).toBeDefined();
    expect(storeIndex.RatingsRepo).toBeDefined();
    expect(storeIndex.ServiceItemsRepo).toBeDefined();
    expect(storeIndex.BikesRepo).toBeDefined();
    expect(storeIndex.ChatThreadsRepo).toBeDefined();
    expect(storeIndex.InvitesRepo).toBeDefined();
  });

  it("exports convenience functions", async () => {
    const storeIndex = await import("./index");
    expect(typeof storeIndex.getProfileForSession).toBe("function");
    expect(typeof storeIndex.createSession).toBe("function");
    expect(typeof storeIndex.removeSession).toBe("function");
    expect(typeof storeIndex.seedIfEmpty).toBe("function");
    expect(typeof storeIndex.ensureJourneyProfiles).toBe("function");
    expect(typeof storeIndex.ensureServiceSeed).toBe("function");
  });
});
