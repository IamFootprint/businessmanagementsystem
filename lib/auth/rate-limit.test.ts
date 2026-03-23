import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, getClientIp, RATE_LIMIT_WINDOW_MS } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    const key = "test-key-1";
    for (let i = 0; i < 5; i++) {
      const result = rateLimit(key, 5, 60_000);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks requests beyond the limit", () => {
    const key = "test-key-2";
    for (let i = 0; i < 3; i++) {
      rateLimit(key, 3, 60_000);
    }
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    const key = "test-key-3";
    for (let i = 0; i < 3; i++) {
      rateLimit(key, 3, 60_000);
    }
    expect(rateLimit(key, 3, 60_000).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    const afterReset = rateLimit(key, 3, 60_000);
    expect(afterReset.allowed).toBe(true);
  });

  it("tracks remaining count correctly", () => {
    const key = "test-key-4";
    const r1 = rateLimit(key, 3, 60_000);
    expect(r1.remaining).toBe(2);
    const r2 = rateLimit(key, 3, 60_000);
    expect(r2.remaining).toBe(1);
    const r3 = rateLimit(key, 3, 60_000);
    expect(r3.remaining).toBe(0);
  });

  it("uses separate counters per key", () => {
    rateLimit("key-a", 1, 60_000);
    expect(rateLimit("key-a", 1, 60_000).allowed).toBe(false);
    expect(rateLimit("key-b", 1, 60_000).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "10.0.0.1" });
    expect(getClientIp(headers)).toBe("10.0.0.1");
  });

  it("returns unknown when no IP headers present", () => {
    const headers = new Headers();
    expect(getClientIp(headers)).toBe("unknown");
  });
});

describe("RATE_LIMIT_WINDOW_MS", () => {
  it("is one hour", () => {
    expect(RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });
});
