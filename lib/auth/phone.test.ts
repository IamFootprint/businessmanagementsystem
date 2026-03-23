import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { normalizePhone, validateE164, isAllowedPhone, maskPhone, shouldRequireE164 } from "./phone";

describe("normalizePhone", () => {
  it("strips whitespace", () => {
    expect(normalizePhone("+27 82 123 4567")).toBe("+27821234567");
  });

  it("strips dashes", () => {
    expect(normalizePhone("+27-82-123-4567")).toBe("+27821234567");
  });

  it("strips mixed whitespace and dashes", () => {
    expect(normalizePhone("+27 82-123 4567")).toBe("+27821234567");
  });

  it("leaves clean numbers unchanged", () => {
    expect(normalizePhone("+27821234567")).toBe("+27821234567");
  });
});

describe("validateE164", () => {
  it("accepts valid E.164 numbers", () => {
    expect(validateE164("+27821234567")).toBe(true);
    expect(validateE164("+14155551234")).toBe(true);
  });

  it("rejects numbers without +", () => {
    expect(validateE164("27821234567")).toBe(false);
  });

  it("rejects numbers starting with +0", () => {
    expect(validateE164("+0821234567")).toBe(false);
  });

  it("rejects too-short numbers", () => {
    expect(validateE164("+1234567")).toBe(false);
  });

  it("rejects too-long numbers", () => {
    expect(validateE164("+1234567890123456")).toBe(false);
  });

  it("rejects numbers with non-digits", () => {
    expect(validateE164("+27abc234567")).toBe(false);
  });
});

describe("isAllowedPhone", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("allows South African numbers by default", () => {
    delete process.env.STATIC_OTP_ALLOWED_PHONE_PREFIXES;
    delete process.env.STATIC_OTP_ALLOWED_COUNTRIES;
    expect(isAllowedPhone("+27821234567")).toBe(true);
  });

  it("rejects non-ZA numbers by default", () => {
    delete process.env.STATIC_OTP_ALLOWED_PHONE_PREFIXES;
    delete process.env.STATIC_OTP_ALLOWED_COUNTRIES;
    expect(isAllowedPhone("+14155551234")).toBe(false);
  });

  it("respects STATIC_OTP_ALLOWED_PHONE_PREFIXES", () => {
    process.env.STATIC_OTP_ALLOWED_PHONE_PREFIXES = "+1,+44";
    expect(isAllowedPhone("+14155551234")).toBe(true);
    expect(isAllowedPhone("+441234567890")).toBe(true);
    expect(isAllowedPhone("+27821234567")).toBe(false);
  });
});

describe("maskPhone", () => {
  it("masks the middle of the phone", () => {
    expect(maskPhone("+27821234567")).toBe("+27******567");
  });

  it("handles very short strings", () => {
    expect(maskPhone("1234")).toBe("****");
  });
});

describe("shouldRequireE164", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns true by default", () => {
    delete process.env.STATIC_OTP_REQUIRE_E164;
    expect(shouldRequireE164()).toBe(true);
  });

  it("returns true when env is 'true'", () => {
    process.env.STATIC_OTP_REQUIRE_E164 = "true";
    expect(shouldRequireE164()).toBe(true);
  });

  it("returns false when env is 'false'", () => {
    process.env.STATIC_OTP_REQUIRE_E164 = "false";
    expect(shouldRequireE164()).toBe(false);
  });
});
