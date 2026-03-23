import { describe, it, expect } from "vitest";
import {
  getDeterministicDevOtp,
  matchesDeterministicDevOtp,
  normalizeOtp,
} from "./devOtp";

describe("getDeterministicDevOtp", () => {
  it('returns "246001" for +27110000001', () => {
    expect(getDeterministicDevOtp("+27110000001")).toBe("246001");
  });

  it('returns "246003" for +27110000003', () => {
    expect(getDeterministicDevOtp("+27110000003")).toBe("246003");
  });

  it('returns "246004" for +27110000004', () => {
    expect(getDeterministicDevOtp("+27110000004")).toBe("246004");
  });

  it("always returns a 6-character string", () => {
    const otp = getDeterministicDevOtp("+27110000001");
    expect(otp).toHaveLength(6);
  });

  it("handles short phone numbers by padding suffix", () => {
    const otp = getDeterministicDevOtp("+1");
    // digits of "+1" = "1", last 3 = "1", padded to "001"
    expect(otp).toBe("246001");
  });
});

describe("matchesDeterministicDevOtp", () => {
  it("returns true when submitted OTP matches the expected OTP", () => {
    expect(matchesDeterministicDevOtp("+27110000001", "246001")).toBe(true);
  });

  it("returns false when submitted OTP does not match", () => {
    expect(matchesDeterministicDevOtp("+27110000001", "999999")).toBe(false);
  });

  it("returns false when submitted OTP has wrong length", () => {
    expect(matchesDeterministicDevOtp("+27110000001", "24600")).toBe(false);
  });

  it("normalizes submitted OTP before comparing", () => {
    // spaces should be stripped
    expect(matchesDeterministicDevOtp("+27110000001", " 246001 ")).toBe(true);
  });
});

describe("normalizeOtp", () => {
  it("strips non-digit characters and spaces", () => {
    expect(normalizeOtp("  2 4 6 0 0 1  ")).toBe("246001");
  });

  it("truncates to 6 digits", () => {
    expect(normalizeOtp("123-456-789")).toBe("123456");
  });

  it("returns empty string for non-numeric input", () => {
    expect(normalizeOtp("abcdef")).toBe("");
  });

  it("preserves up to 6 digits from a short input", () => {
    expect(normalizeOtp("12")).toBe("12");
  });
});
